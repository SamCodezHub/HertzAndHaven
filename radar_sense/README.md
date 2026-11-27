# Hertz & Haven Local Monitor

A Windows dashboard for USB serial readings from an ESP32-S3 and DFRobot C4001 SEN0609. It includes local fall-like motion alerts for supervised mat trials. The ESP32 uses neither Wi-Fi nor LEDs. The alert detector starts disarmed.

## Use the radar OUT pin for a presence demo

If the radar's UART is unavailable, you can still use the digital OUT pin. With USB unplugged, connect **VIN  3V3**, **GND  GND**, and **OUT  GPIO18**. Leave the radar's TX and RX pins empty. This wiring assumes the radar is powered from 3.3 V.

Upload `firmware/HertzHavenPresenceOut/HertzHavenPresenceOut.ino` to **ESP32S3 Dev Module**. With the DevKit's native USB port, select **USB CDC On Boot  Enabled**. Close Serial Monitor before starting or reconnecting the Windows app. Restart an older copy of the Windows app to load the updated dashboard. After selecting the ESP32 COM port, look for **Radar OUT live** and a **HIGH** or **LOW** output. Compare an empty scene with movement in front of the radar to verify which level represents presence on your module.

This mode displays the electrical level read by the ESP32. It cannot verify the sensor is attached if the wire is disconnected and the input reads LOW. Distance, speed, count, and fall alerts are unavailable in OUT mode. CSV records these samples with `source=out` and the `out_level` field.

## 1. Wire and flash the ESP32-S3

Power down before wiring.

| C4001 SEN0609 | ESP32-S3 |
| --- | --- |
| VIN | 3V3 |
| GND | GND |
| TX | GPIO5 (ESP32 RX) |
| RX | GPIO6 (ESP32 TX) |
| OUT | Leave open |

1. In Arduino IDE, install **esp32 by Espressif Systems (3.x)** in Boards Manager. Select **ESP32S3 Dev Module** and the board's COM port.
2. Open `firmware/HertzHavenDiagnostics56/HertzHavenDiagnostics56.ino` and upload it. This self-contained sketch requires no additional Arduino libraries. If Serial Monitor already reports `$DFDMD` with GPIO5 and GPIO6, skip the upload.
3. If you use the port labeled **UART** on the DevKit, set **USB CDC On Boot  Disabled**. If you use the DevKit's native **USB** port, set **USB CDC On Boot  Enabled**. Use a USB data cable. The COM number can change when switching USB connectors or leaving the bootloader.
4. As an initial check, open Arduino Serial Monitor at **115200** and reset the board. Look for a startup banner, regular `HH1,...` diagnostics, and `$DFDMD,...*` frames. **Close Serial Monitor before clicking Connect** in the dashboard.

The radar link starts on UART1 at **9600, 8N1**. The firmware listens first and leaves an already streaming module alone. If speed frames are absent, it requests the hardware version, then tries the vendor command sequence to stop the module, select speed/distance mode, and start it. It tries both command line endings and temporarily checks 115200 on the radar link, because the protocol PDF lists that rate. The Windows USB link stays at 115200 throughout. Watch for **Radar UART probe** in the console and allow about 35 seconds for a full pass. The firmware leaves the radar's saved settings intact. Output includes the original radar frames, command replies, and a once-per-second `HH1,uptime_ms,uart_bytes,speed_frames,presence_frames,overflows` heartbeat from the ESP32.

## 2. Start the Windows app

1. Install Python **3.10 or later** for Windows and confirm that `py -3 --version` or `python --version` works in Command Prompt.
2. Extract the full application folder if you received the ZIP. Double-click **Start-HertzHaven.cmd**. The launcher creates a private `.venv` and installs **PySerial 3.5** on first run. This installation needs internet or a preconfigured package source. Afterwards the app runs locally.
3. Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) if the browser does not open. Keep the launcher window open. The server listens on the Windows loopback address only.
4. Choose the board's USB COM port and click **Connect**. The dashboard hides Windows Bluetooth/RFCOMM entries and only shows physical serial candidates. If no USB port appears, plug in a USB data cable and click **Refresh**.

Manual launch from PowerShell in the application folder:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py --open
```

If port 8765 is already in use, add `--port 8766` to the last command and follow the URL printed in the terminal.

To use the [hosted dashboard](https://hertzandhaven.vercel.app/radar/), start this Windows app on the PC connected to the ESP32. On its local page, expand **Hosted dashboard access** and click **Enable hosted dashboard**. Open the hosted site on the same PC, choose **Link this PC**, allow local network access if prompted, then select the ESP32's USB port and click **Connect**. The hosted page checks local ports 8765 and 8766. You can disable hosted access on the local page, and closing the app ends access. Bluetooth/RFCOMM entries are hidden; if no USB port appears, check the ESP32's USB data cable and click **Refresh**.

## 3. Verify real readings

| What you see | What to check |
| --- | --- |
| No COM port appears | Try a USB data cable and check Windows Device Manager for the DevKit or its USB-to-UART bridge. |
| COM port error / access denied | Close Arduino Serial Monitor, other terminal apps, or another instance of the dashboard. Try connecting again. |
| COM port opens, but no `HH1` lines arrive | Check the selected COM port and USB CDC setting. Reset the ESP32 with the dashboard connected. Confirm the diagnostics sketch was uploaded. |
| `HH1` arrives but radar UART bytes stay nearly flat through every probe | Check sensor power and common ground, cross sensor TX to ESP32 GPIO5, and cross ESP32 GPIO6 to sensor RX. Make sure the sensor header is soldered and the jumpers grip the pins. |
| Presence frames `$DFHPD` arrive without `$DFDMD` | Sensor RX may be disconnected or the module may still be in presence mode. Look for command replies in the console. If needed, use the vendor's speed/distance setup example to restore that mode. |
| Valid frames show target count 0 | The serial path works. Move toward or away from the radar around 2-3 m in front of it and check for a distance and signed radial speed. |
| Dashboard shows malformed frames | Compare the raw line with the SEN0609 protocol. The app leaves the measurements blank when valid frames stop. |

A clean acceptance check is a short recording of an empty room, approach, departure, and a radar disconnect. Empty-room frames have count 0 and blank distance/speed in the CSV. The radar signal history distinguishes target returns, valid empty frames, OUT readings, and periods without recent frames. A sample occupies its lane until the next observation or the detector's maximum gap (0.65 seconds by default), whichever comes first. The timeline keeps scrolling if the stream or local app stops.

The distance and speed graphs show 30 seconds of returns. Hollow dots show unconfirmed measurements, including targets outside the trial zone. Three consistent in-zone measurements establish a track, shown as a solid trace. A brief dropout can preserve the track for up to 0.65 seconds. Missing measurements leave gaps. CSV includes reception time in UTC, COM port, target count, distance, radial speed, energy, source, and OUT level. The app retains up to 100,000 validated samples from the current connection in memory. Disconnecting allows you to export the existing session. Connecting again or exiting starts a fresh capture, so export first.

## 4. Run a supervised fall-like motion trial

1. Start with the mat about **2-3 m** from the wall-mounted radar. Keep a spotter nearby and the rest of the beam clear of moving spectators. The default gate is **1.2-5.0 m measured slant range**. Try farther positions only after you can repeat the near trials reliably.
2. With **Radar live** visible, click **Arm demo**. Begin with gentle movement in the mat zone until the app says **Tracking motion**. During a supervised trial, make a controlled descent onto the mat with some motion toward or away from the sensor and pause afterward.
3. The detector needs two speed readings of at least **0.75 m/s** after prior tracking, then **1.6 s** of quiet. A valid stream of zero-target frames can count as quiet after an in-range burst. Missing, malformed, and OUT-only frames cannot confirm an alert. The alert stays visible until **Acknowledge**, which starts a short cooldown.
4. Compare the controlled descents with walking, sitting, kneeling, and leaving the zone. Download the raw readings and alert CSVs for calibration. Record both missed trials and nuisance alerts before changing one setting at a time in `FallConfig` in `fall_detector.py`, then restart the app. If walk-outs cause alerts, try setting `allow_no_target_as_quiet` to `False` and check whether the radar still supplies enough low-speed readings after a descent.

The radar reports one moving target's range and radial speed. It does not measure floor contact or posture. Fast sitting or leaving the beam can trigger an alert, and lateral or slow falls can be missed. Stage and calibrate it for the supervised demonstration. The latest 50 alerts stay in memory across connections for the current app run and can be downloaded separately as CSV.

## 5. Try the simulated emergency lockbox

The virtual lockbox normally opens with its permanent four-digit demo password, **2468**. When a fall-like alert is confirmed, the app re-locks the box and sends a six-digit, single-use OTP to the simulated **Emergency phone notification**. Either the permanent password or the active emergency OTP opens the box. Select **Re-lock box** to reset the demonstration. An OTP expires after ten minutes, becomes invalid after any successful unlock, and is replaced by a newer fall alert.

For a sensor-free demonstration, leave the serial connection disconnected and select **Simulate fall**. The dashboard adds a synthetic tracking, rapid-motion, and quiet sequence to the graphs, raises the fall alert, and generates the emergency OTP. Use the OTP or the normal password to unlock the virtual box, then acknowledge the alert. The synthetic readings are identified as `source=simulation` in the readings CSV.

This flow is entirely local. It does not send an SMS, contact a caregiver, or control physical lock hardware.

[DFRobot SEN0609 wiring and specifications](https://wiki.dfrobot.com/sen0609/) � [Vendor speed/distance example](https://wiki.dfrobot.com/sen0609/docs/20936) � [SEN0609 UART protocol](https://download.kamami.pl/p1196974-Communication%20Protocol.pdf)
