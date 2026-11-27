"""Fall-like motion recognition for supervised single-target radar trials."""
from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True)
class FallConfig:
    min_range_m: float = 1.2
    max_range_m: float = 5.0
    burst_mps: float = 0.75
    quiet_mps: float = 0.16
    track_s: float = 0.30
    burst_hits: int = 2
    confirm_s: float = 0.65
    settle_s: float = 1.40
    quiet_s: float = 1.60
    quiet_hits: int = 4
    max_gap_s: float = 0.65
    max_step_m: float = 1.10
    edge_m: float = 0.25
    allow_no_target_as_quiet: bool = True
    cooldown_s: float = 2.5


class RangeTrack:
    """Associate nearby radar returns for a single-person mat trial."""

    def __init__(self, config):
        self.config = config
        self.last = None
        self.at = 0.0
        self.hits = 0
        self.generation = 0

    def current(self, now):
        if self.hits >= 3 and now - self.at <= self.config.max_gap_s:
            return self.last
        return None

    def update(self, sample, now):
        dt = now - self.at
        if dt > self.config.max_gap_s:
            self.hits = 0
        distance = sample["distance_m"]
        if distance is None or not self.config.min_range_m <= distance <= self.config.max_range_m:
            return False
        if self.hits:
            speed = max(abs(self.last["speed_mps"]), abs(sample["speed_mps"]))
            gate = min(0.85, 0.18 + (0.5 + min(speed, 3.0)) * dt)
            if abs(distance - self.last["distance_m"]) > gate:
                if self.hits >= 3:
                    return False
                self.hits = 0
        if not self.hits:
            self.generation += 1
        self.last = sample
        self.at = now
        self.hits += 1
        return self.hits >= 3


class FallDetector:
    """Consumes valid UART observations at monotonic receive times."""

    def __init__(self, config=FallConfig()):
        self.config = config
        self.armed = False
        self.active = None
        self.history = deque(maxlen=50)
        self.last_frame = None
        self.cooldown_until = 0.0
        self._reset_candidate()

    def _reset_candidate(self):
        self.phase = "waiting"
        self.last_distance = None
        self.last_target_at = None
        self.track_since = 0.0
        self.burst_at = 0.0
        self.burst_hits = 0
        self.peak_speed = 0.0
        self.peak_range = 0.0
        self.quiet_at = 0.0
        self.quiet_hits = 0
        self.quiet_with_no_target = False

    def set_armed(self, enabled):
        if self.armed != enabled:
            self.armed = enabled
            self._reset_candidate()

    def break_track(self):
        self._reset_candidate()

    def acknowledge(self, now):
        if self.active is not None:
            self.active = None
            self.cooldown_until = now + self.config.cooldown_s
            self._reset_candidate()

    def simulate_alert(self, received_epoch, port="SIMULATION"):
        """Create the same latched alert used by the supervised demo."""
        event = {
            "time": received_epoch, "port": port, "range_m": 2.4,
            "peak_mps": 1.1, "quiet_s": self.config.quiet_s,
            "target_lost": True, "simulated": True,
        }
        self.active = event
        self.history.append(event)
        self._reset_candidate()
        return event

    def _expire(self, now):
        if self.phase == "waiting":
            return
        cfg = self.config
        lost = self.last_frame is None or now - self.last_frame > cfg.max_gap_s
        if self.phase == "tracking" and now - self.last_target_at > cfg.max_gap_s:
            lost = True
        settling_expired = self.phase == "burst" and now - self.burst_at > cfg.settle_s
        unconfirmed = (self.phase == "burst" and self.burst_hits < cfg.burst_hits and
                       now - self.burst_at > cfg.confirm_s)
        if lost or settling_expired or unconfirmed:
            self._reset_candidate()

    def status(self, now, fresh):
        self._expire(now)
        if self.active:
            phase = "alert"
        elif not self.armed:
            phase = "disarmed"
        elif not fresh:
            phase = "no_telemetry"
        elif now < self.cooldown_until:
            phase = "cooldown"
        else:
            phase = self.phase
        return {
            "armed": self.armed, "ready": fresh, "phase": phase,
            "active": self.active, "history": list(reversed(self.history)),
            "min_range_m": self.config.min_range_m, "max_range_m": self.config.max_range_m,
            "burst_mps": self.config.burst_mps, "quiet_s": self.config.quiet_s,
            "max_gap_s": self.config.max_gap_s,
        }

    def observe(self, sample, now, received_epoch, port):
        self._expire(now)
        self.last_frame = now
        if not self.armed or self.active or now < self.cooldown_until:
            return

        cfg = self.config
        distance = sample["distance_m"]
        speed = abs(sample["speed_mps"]) if distance is not None else None
        if distance is not None:
            if not cfg.min_range_m <= distance <= cfg.max_range_m:
                self._reset_candidate()
                return
            if self.last_distance is not None and abs(distance - self.last_distance) > cfg.max_step_m:
                self._reset_candidate()
                return
            self.last_distance = distance
            self.last_target_at = now

        if self.phase == "waiting":
            if speed is not None and speed < cfg.burst_mps:
                self.phase = "tracking"
                self.track_since = now
            return

        if self.phase == "tracking":
            if speed is not None and speed >= cfg.burst_mps:
                if now - self.track_since < cfg.track_s:
                    self._reset_candidate()
                    return
                self.phase = "burst"
                self.burst_at = now
                self.burst_hits = 1
                self.peak_speed = speed
                self.peak_range = distance
            return

        if speed is not None and speed >= cfg.burst_mps:
            self.burst_hits += 1
            if speed > self.peak_speed:
                self.peak_speed = speed
                self.peak_range = distance

        if speed is None:
            reference = self.last_distance
            quiet = (cfg.allow_no_target_as_quiet and reference is not None and
                     cfg.min_range_m + cfg.edge_m <= reference <= cfg.max_range_m - cfg.edge_m)
            if not quiet:
                self._reset_candidate()
                return
        else:
            quiet = speed <= cfg.quiet_mps

        if not quiet:
            if self.phase == "quiet":
                if now - self.burst_at > cfg.settle_s:
                    self._reset_candidate()
                else:
                    self.phase = "burst"
            return

        if self.burst_hits < cfg.burst_hits:
            return

        if self.phase == "burst":
            self.phase = "quiet"
            self.quiet_at = now
            self.quiet_hits = 0
            self.quiet_with_no_target = False

        self.quiet_hits += 1
        self.quiet_with_no_target |= speed is None
        if now - self.quiet_at >= cfg.quiet_s and self.quiet_hits >= cfg.quiet_hits:
            self.active = {
                "time": received_epoch, "port": port, "range_m": self.peak_range,
                "peak_mps": self.peak_speed, "quiet_s": round(now - self.quiet_at, 2),
                "target_lost": self.quiet_with_no_target,
            }
            self.history.append(self.active)
            self._reset_candidate()
