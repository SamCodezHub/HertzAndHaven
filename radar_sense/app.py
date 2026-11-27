"""Local USB monitor for the Hertz & Haven diagnostic firmware."""
import argparse
import csv
import io
import json
import math
import secrets
import threading
import time
import webbrowser
from collections import deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from fall_detector import FallDetector, RangeTrack

HOST = "127.0.0.1"
HOSTED_ORIGIN = "https://hertzandhaven.vercel.app"
BAUD = 115200
STALE_SECONDS = 3.0
SAMPLE_LIMIT = 100_000
CONSOLE_LIMIT = 400
WEB = Path(__file__).with_name("web")
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/motion.css": ("motion.css", "text/css; charset=utf-8"),
    "/dashboard.js": ("dashboard.js", "text/javascript; charset=utf-8"),
}
CSV_FIELDS = ("timestamp_utc", "port", "target_count", "distance_m", "speed_mps", "energy",
              "source", "out_level")
EVENT_FIELDS = ("timestamp_utc", "port", "range_m", "peak_mps", "quiet_s", "target_lost")
OTP_TTL_SECONDS = 10 * 60
NORMAL_LOCKBOX_PASSWORD = "2468"


def is_physical_serial_port(port):
    """Keep USB serial candidates and hide Bluetooth/virtual Windows COM entries."""
    details = " ".join(str(getattr(port, field, "")) for field in ("description", "hwid")).lower()
    if any(marker in details for marker in ("bluetooth", "bthenum", "bthenum")):
        return False
    return any(marker in details for marker in (
        "usb", "vid:pid", "usbser", "ftdi", "cp210", "ch340", "silicon labs",
        "espressif", "jtag",
    ))


def csv_text(rows, fields):
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(fields)
    for row in rows:
        timestamp = datetime.fromtimestamp(row["time"], timezone.utc).isoformat(timespec="milliseconds")
        writer.writerow((timestamp, *(row.get(key) for key in fields[1:])))
    return output.getvalue()


def parse_frame(line):
    """Return one measured frame, or raise ValueError on malformed telemetry."""
    if not line.startswith("$DFDMD,") or not line.endswith("*"):
        raise ValueError("Incomplete DFDMD frame")
    fields = [field.strip() for field in line[:-1].split(",")]
    if len(fields) != 8 or fields[1] not in {"0", "1"}:
        raise ValueError("Invalid DFDMD fields")
    if any(fields[6:]):
        raise ValueError("Unexpected data in reserved DFDMD fields")
    if fields[1] == "0":
        if any(fields[2:6]):
            raise ValueError("Unexpected measurement in an empty DFDMD frame")
        return {"target_count": 0, "distance_m": None, "speed_mps": None, "energy": None}
    distance, speed = map(float, fields[3:5])
    if (fields[2] != "1" or not 0 <= distance <= 25 or
            not math.isfinite(speed) or not -10 <= speed <= 10 or
            not fields[5].isascii() or not fields[5].isdecimal()):
        raise ValueError("Invalid DFDMD measurement")
    energy = int(fields[5])
    if energy > 0xFFFFFFFF:
        raise ValueError("Invalid target energy")
    return {"target_count": 1, "distance_m": distance, "speed_mps": speed, "energy": energy}


class LockboxSimulation:
    """A permanent door password plus a fall-triggered, single-use OTP."""

    def __init__(self):
        self.locked = True
        self.code = None
        self.expires_at = 0.0
        self.notification = None
        self.last_unlock_method = None

    def trigger(self, event, now, received_epoch):
        self.locked = True
        self.code = f"{secrets.randbelow(1_000_000):06d}"
        self.expires_at = now + OTP_TTL_SECONDS
        self.notification = {
            "time": received_epoch,
            "code": self.code,
            "message": ("Simulated emergency notification: possible fall-like motion "
                        f"detected at {event['range_m']:.2f} m. Use this one-time code."),
        }
        self.last_unlock_method = None

    def _expire(self, now):
        if self.code is not None and now >= self.expires_at:
            self.code = None
            self.expires_at = 0.0

    def status(self, now):
        self._expire(now)
        return {
            "locked": self.locked,
            "code": self.code,
            "expires_in": None if self.code is None else max(0, self.expires_at - now),
            "notification": self.notification,
            "normal_password": NORMAL_LOCKBOX_PASSWORD,
            "last_unlock_method": self.last_unlock_method,
        }

    def unlock(self, credential, now):
        self._expire(now)
        if (not isinstance(credential, str) or not credential.isdecimal() or
                len(credential) not in {4, 6}):
            raise ValueError("Enter the four-digit door password or six-digit emergency OTP.")
        if secrets.compare_digest(credential, NORMAL_LOCKBOX_PASSWORD):
            self.last_unlock_method = "password"
        elif self.code is None:
            raise ValueError("Door password is incorrect. No emergency OTP is active.")
        elif not secrets.compare_digest(credential, self.code):
            raise ValueError("Door password or emergency OTP is incorrect.")
        else:
            self.last_unlock_method = "emergency_otp"
        self.locked = False
        self.code = None
        self.expires_at = 0.0

    def lock(self):
        self.locked = True
        self.last_unlock_method = None


class Monitor:
    def __init__(self, serial_factory):
        self.serial_factory = serial_factory
        self.control = threading.Lock()
        self.lock = threading.Lock()
        self.stop = threading.Event()
        self.worker = None
        # A browser may remain open across server restarts. Keep its cursor scoped
        # to one capture, including the first connection after a restart.
        self.session = secrets.randbits(48)
        self.port = None
        self.connection = "disconnected"
        self.error = None
        self.samples = deque(maxlen=SAMPLE_LIMIT)
        self.console = deque(maxlen=CONSOLE_LIMIT)
        self.sample_id = self.console_id = self.invalid = 0
        self.last_frame = self.last_usb = self.opened_at = None
        self.last_out = self.out_level = self.latest_range = None
        self.frame_count = 0
        self.heartbeat = None
        self.fall = FallDetector()
        self.track = RangeTrack(self.fall.config)
        self.lockbox = LockboxSimulation()

    def connect(self, port):
        with self.control:
            self._disconnect()
            with self.lock:
                self.session += 1
                self.port = port
                self.connection = "opening"
                self.error = None
                self.samples.clear()
                self.track = RangeTrack(self.fall.config)
                self.console.clear()
                self.sample_id = self.console_id = self.invalid = 0
                self.last_frame = self.last_usb = self.opened_at = None
                self.last_out = self.out_level = self.latest_range = None
                self.frame_count = 0
                self.heartbeat = None
            self.stop.clear()
            self.worker = threading.Thread(target=self._read, args=(port,), daemon=True)
            self.worker.start()

    def disconnect(self):
        with self.control:
            self._disconnect()

    def _disconnect(self):
        if self.worker is not None:
            self.stop.set()
            self.worker.join(timeout=2)
            if self.worker.is_alive():
                raise RuntimeError("Windows is still closing the serial port. Try again shortly.")
            self.worker = None
        with self.lock:
            self.connection = "disconnected"
            self.error = None
            self.fall.set_armed(False)

    def _read(self, port):
        pending = bytearray()
        dropping = False
        try:
            with self.serial_factory(port=port, baudrate=BAUD, timeout=0.2) as device:
                with self.lock:
                    self.opened_at = time.monotonic()
                    self.connection = "open"
                while not self.stop.is_set():
                    chunk = device.read(min(max(device.in_waiting, 1), 4096))
                    for byte in chunk:
                        if byte == 10:
                            if not dropping and pending:
                                self.ingest(pending.decode("utf-8", errors="replace").rstrip("\r"))
                            pending.clear()
                            dropping = False
                        elif not dropping:
                            if len(pending) < 512:
                                pending.append(byte)
                            else:
                                pending.clear()
                                dropping = True
                                self.ingest("[monitor] Dropped an oversized serial line")
        except (OSError, ValueError) as exc:
            with self.lock:
                self.error = str(exc)
                self.connection = "error"
                self.fall.set_armed(False)

    def ingest(self, line):
        """Keep the received console text and publish validated telemetry only."""
        now = time.time()
        received_at = time.monotonic()
        with self.lock:
            self.last_usb = received_at
            self.console_id += 1
            self.console.append({"id": self.console_id, "time": now, "text": line})
            sample = None
            if line.startswith("$DFDMD"):
                try:
                    sample = parse_frame(line)
                except ValueError:
                    self.invalid += 1
                    return
                self.last_frame = received_at
                self.frame_count += 1
                sample["source"] = "uart"
                self.latest_range = sample
                accepted = self.track.update(sample, received_at)
                sample["track_id"] = self.track.generation if accepted else None
                previous_alert = self.fall.active
                if accepted or sample["target_count"] == 0:
                    self.fall.observe(sample, received_at, now, self.port)
                else:
                    self.fall.break_track()
                if previous_alert is None and self.fall.active is not None:
                    self.lockbox.trigger(self.fall.active, received_at, now)
            elif line in {"HHOUT,0", "HHOUT,1"}:
                self.last_out = received_at
                self.out_level = int(line[-1])
                sample = {"source": "out", "out_level": self.out_level,
                          "target_count": None, "distance_m": None, "speed_mps": None,
                          "energy": None}
            elif line.startswith("HH1,"):
                try:
                    values = [int(field) for field in line.split(",")[1:]]
                    if len(values) == 5 and all(0 <= value <= 0xFFFFFFFF for value in values):
                        keys = ("uptime_ms", "uart_bytes", "speed_frames", "presence_frames", "overflows")
                        self.heartbeat = dict(zip(keys, values))
                except ValueError:
                    pass
            if sample is not None:
                self.sample_id += 1
                self.samples.append(dict(sample, id=self.sample_id, time=now, port=self.port))

    def snapshot(self, session, after, log_after):
        with self.lock:
            now = time.monotonic()
            age = None if self.last_frame is None else now - self.last_frame
            out_age = None if self.last_out is None else now - self.last_out
            usb_age = None if self.last_usb is None else now - self.last_usb
            usb_live = usb_age is not None and usb_age <= STALE_SECONDS
            if session != self.session:
                after = log_after = 0
            live = self.connection == "open" and age is not None and age <= STALE_SECONDS
            if self.connection != "open":
                radar = "offline"
            elif live:
                radar = "live"
            elif out_age is not None and out_age <= STALE_SECONDS:
                radar = "out_live"
            elif out_age is not None:
                radar = "out_stale"
            elif now - self.opened_at <= STALE_SECONDS:
                radar = "waiting"
            elif not usb_live:
                radar = "usb_silent"
            elif self.heartbeat and self.heartbeat["presence_frames"] and not self.heartbeat["speed_frames"]:
                radar = "presence"
            elif self.invalid and self.last_frame is None:
                radar = "invalid"
            else:
                radar = "silent"
            # Slice from the right without scanning the long CSV history on every poll.
            new_count = min(500, len(self.samples), max(0, self.sample_id - after))
            batch = [self.samples[index] for index in range(-new_count, 0)]
            logs = [entry for entry in self.console if entry["id"] > log_after]
            return {
                "session": self.session, "port": self.port, "connection": self.connection,
                "error": self.error, "radar": radar, "age": age, "usb_age": usb_age,
                "current": self.latest_range if live else None, "samples": batch, "logs": logs,
                "track": self.track.current(now) if live else None,
                "sample_count": self.frame_count, "retained": len(self.samples),
                "out_age": out_age, "out_level": self.out_level if (
                    self.connection == "open" and out_age is not None and out_age <= STALE_SECONDS
                ) else None,
                "invalid": self.invalid, "heartbeat": self.heartbeat, "time": time.time(),
                "fall": self.fall.status(now, self._fall_ready(now)),
                "lockbox": self.lockbox.status(now),
                "simulation": bool(self.fall.active and self.fall.active.get("simulated")),
            }

    def _fall_ready(self, now):
        return (self.connection == "open" and self.last_frame is not None and
                now - self.last_frame <= self.fall.config.max_gap_s)

    def arm_fall(self, enabled):
        with self.lock:
            if enabled and not self._fall_ready(time.monotonic()):
                raise ValueError("Connect and wait for fresh UART radar frames before arming.")
            self.fall.set_armed(enabled)

    def acknowledge_fall(self):
        with self.lock:
            self.fall.acknowledge(time.monotonic())

    def simulate_fall(self):
        with self.lock:
            if self.connection in {"open", "opening"}:
                raise ValueError("Disconnect the sensor before running the fall simulation.")
            if self.fall.active is not None:
                raise ValueError("Acknowledge the current alert before simulating another fall.")
            now = time.monotonic()
            received_epoch = time.time()
            event = self.fall.simulate_alert(received_epoch)
            self.lockbox.trigger(event, now, received_epoch)
            track_id = f"simulation-{self.session}-{self.sample_id + 1}"
            sequence = (
                (-4.0, 1, 2.70, 0.15, track_id),
                (-3.5, 1, 2.65, 0.22, track_id),
                (-3.0, 1, 2.55, 0.18, track_id),
                (-2.5, 1, 2.45, -0.85, track_id),
                (-2.2, 1, 2.30, -1.10, track_id),
                (-1.8, 1, 2.20, 0.12, track_id),
                (-1.3, 0, None, None, None),
                (-0.8, 0, None, None, None),
                (-0.3, 0, None, None, None),
                (0.0, 0, None, None, None),
            )
            for offset, count, distance, speed, sample_track_id in sequence:
                self.sample_id += 1
                self.samples.append({
                    "id": self.sample_id, "time": received_epoch + offset,
                    "port": "SIMULATION", "source": "simulation",
                    "target_count": count, "distance_m": distance,
                    "speed_mps": speed, "energy": 42 if count else None,
                    "track_id": sample_track_id,
                })
            self.console_id += 1
            self.console.append({
                "id": self.console_id, "time": received_epoch,
                "text": "[simulation] Fall-like motion detected; emergency OTP sent.",
            })

    def unlock_lockbox(self, code):
        with self.lock:
            self.lockbox.unlock(code, time.monotonic())

    def lock_lockbox(self):
        with self.lock:
            self.lockbox.lock()

    def export(self):
        with self.lock:
            rows = list(self.samples)
        return csv_text(rows, CSV_FIELDS)

    def export_events(self):
        with self.lock:
            events = list(self.fall.history)
        return csv_text(events, EVENT_FIELDS)


def serve(monitor, list_ports, port=8765):
    hosted_access = threading.Event()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, _format, *_args):
            pass

        def bytes(self, payload, mime, status=200, download=None):
            self.send_response(status)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if self.hosted_request():
                self.send_header("Access-Control-Allow-Origin", HOSTED_ORIGIN)
                self.send_header("Vary", "Origin")
            if download:
                self.send_header("Content-Disposition", f'attachment; filename="{download}"')
            self.end_headers()
            self.wfile.write(payload)

        def json(self, data, status=200):
            self.bytes(json.dumps(data, allow_nan=False).encode(), "application/json", status)

        def local_host(self):
            port = self.server.server_port
            return self.headers.get("Host") in {f"127.0.0.1:{port}", f"localhost:{port}"}

        def hosted_request(self):
            return (self.local_host() and hosted_access.is_set() and
                    self.headers.get("Origin") == HOSTED_ORIGIN)

        def allowed_origin(self):
            origin = self.headers.get("Origin")
            return self.local_host() and (origin is None or
                origin == "http://" + self.headers["Host"] or self.hosted_request())

        def do_OPTIONS(self):
            if not self.hosted_request() or not self.path.startswith("/api/") or self.path == "/api/hosted-access":
                self.json({"error": "Enable the hosted dashboard from the local monitor."}, 403)
                return
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", HOSTED_ORIGIN)
            self.send_header("Access-Control-Allow-Methods", "GET, POST")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Hertz-Monitor")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Vary", "Origin")
            self.end_headers()

        def do_GET(self):
            if not self.allowed_origin():
                self.json({"error": "Use the local application address."}, 403)
                return
            url = urlsplit(self.path)
            if url.path in ASSETS:
                file, mime = ASSETS[url.path]
                self.bytes((WEB / file).read_bytes(), mime)
            elif url.path == "/api/ports":
                self.json({"ports": list_ports()})
            elif url.path == "/api/status":
                query = parse_qs(url.query)
                try:
                    cursors = [int(query.get(key, ["0"])[0]) for key in ("session", "after", "log_after")]
                except ValueError:
                    self.json({"error": "Invalid telemetry cursor."}, 400)
                    return
                self.json(dict(monitor.snapshot(*cursors), hosted_access=hosted_access.is_set()))
            elif url.path == "/api/export":
                self.bytes(monitor.export().encode(), "text/csv; charset=utf-8", download="hertz-haven-readings.csv")
            elif url.path == "/api/events.csv":
                self.bytes(monitor.export_events().encode(), "text/csv; charset=utf-8",
                           download="hertz-haven-alerts.csv")
            else:
                self.json({"error": "Page not found."}, 404)

        def do_POST(self):
            if (not self.allowed_origin() or self.headers.get("X-Hertz-Monitor") != "1" or
                    self.headers.get_content_type() != "application/json"):
                self.json({"error": "Use the local dashboard controls."}, 403)
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 1 <= length <= 512:
                    raise ValueError("Expected a small JSON request.")
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    raise ValueError("Expected a JSON object.")
                if self.path == "/api/hosted-access":
                    if self.headers.get("Origin") == HOSTED_ORIGIN:
                        self.json({"error": "Change access from the local monitor."}, 403)
                        return
                    enabled = data.get("enabled")
                    if not isinstance(enabled, bool):
                        raise ValueError("Expected enabled to be true or false.")
                    if enabled:
                        hosted_access.set()
                    else:
                        hosted_access.clear()
                elif self.path == "/api/connect":
                    port = data.get("port")
                    if not any(entry["device"] == port for entry in list_ports()):
                        raise ValueError("Select an available COM port and try again.")
                    monitor.connect(port)
                elif self.path == "/api/disconnect":
                    monitor.disconnect()
                elif self.path == "/api/fall/arm":
                    enabled = data.get("enabled")
                    if not isinstance(enabled, bool):
                        raise ValueError("Expected enabled to be true or false.")
                    monitor.arm_fall(enabled)
                elif self.path == "/api/fall/acknowledge":
                    monitor.acknowledge_fall()
                elif self.path == "/api/simulation/fall":
                    monitor.simulate_fall()
                elif self.path == "/api/lockbox/unlock":
                    monitor.unlock_lockbox(data.get("code"))
                elif self.path == "/api/lockbox/lock":
                    monitor.lock_lockbox()
                else:
                    self.json({"error": "Page not found."}, 404)
                    return
            except (ValueError, RuntimeError) as exc:
                self.json({"error": str(exc)}, 400)
                return
            self.json({"ok": True})

    return ThreadingHTTPServer((HOST, port), Handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--open", action="store_true", help="Open the dashboard in a browser")
    parser.add_argument("--rehearsal", action="store_true", help="Open the recording demo")
    parser.add_argument("--port", type=int, default=8765, help="Dashboard HTTP port")
    args = parser.parse_args()
    try:
        import serial
        from serial.tools import list_ports
    except ImportError:
        parser.exit(1, "PySerial is required. Run Start-HertzHaven.cmd or install requirements.txt.\n")

    def available_ports():
        return [{"device": port.device, "description": port.description, "hwid": port.hwid}
                for port in sorted(list_ports.comports()) if is_physical_serial_port(port)]

    monitor = Monitor(serial.Serial)
    try:
        server = serve(monitor, available_ports, args.port)
    except OSError as exc:
        parser.exit(1, f"Could not start the local dashboard: {exc}\n")
    with server:
        url = f"http://{HOST}:{server.server_port}/"
        if args.rehearsal:
            url += "?view=rehearsal"
        print(f"Hertz & Haven Monitor is running at {url}\nPress Ctrl+C to stop.", flush=True)
        if args.open:
            webbrowser.open(url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            monitor.disconnect()


if __name__ == "__main__":
    main()
