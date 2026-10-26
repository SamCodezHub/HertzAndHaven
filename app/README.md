# Hertz & Haven

Hertz & Haven is a phone dashboard for the signed radial velocity reported by an mmWave sensor. The Android source app and installable mobile web app are both in this project. A small Cloudflare Worker relays readings from the ESP32 to the phone, so they can be viewed away from the local Wi-Fi network.

## How the connection works

`ESP32-S3 → HTTPS → Cloudflare Worker + KV → HTTPS → phone`

Create an account in the app to receive a generated account ID. Pair each ESP32 from inside that account; pairing generates a device ID and a private write key for that board. The Worker stores only each device's newest reading and expires it after 30 days. The app polls every three seconds.

The app expects radial velocity in metres per second. Positive values are shown as motion toward the sensor and negative values as motion away; map the sensor's sign convention to that convention in the firmware when it is available.

## Wire the C4001 radar

For the UART C4001 used by `code.ino`, connect:

| C4001 pin | ESP32-S3 pin |
| --- | --- |
| VIN | 3V3 |
| GND | GND |
| TX | GPIO 18 |
| RX | GPIO 17 |
| OUT | Leave unconnected |

The sensor supports 3.3 V or 5 V power and uses 9600 baud UART; this sketch powers it from 3V3 to keep the serial connection at the ESP32's logic level. If the board's 3V3 rail cannot supply the sensor, use a regulated 3.3 V supply and connect its ground to ESP32 GND. [DFRobot C4001 specifications](https://wiki.dfrobot.com/sen0609/)

## Set up the cloud relay

This deploys the included relay to Cloudflare. The account and deployment belong to you; this project does not contain a pre-deployed public service.

1. Create a Cloudflare account and install Node.js.
2. From the `cloud` folder, install Wrangler and sign in:

   ```powershell
   npm install --global wrangler
   wrangler login
   wrangler kv namespace create TELEMETRY
   ```

3. Copy the namespace `id` returned by Wrangler into `cloud/wrangler.toml`, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.
4. Deploy from the `cloud` folder:

   ```powershell
   wrangler deploy
   ```

The resulting `https://…workers.dev` address is the cloud service URL to enter when creating an account in the app. The app stores the account ID and session token on that phone. Account passwords are stored as salted PBKDF2 hashes in KV. Accounts currently use an ID and password, with no email-based password recovery; keep both somewhere safe.

## Connect a device

The app's **Add sensor** action creates a device ID and a unique write key. It shows the exact `SENSOR_DEVICE_ID` and `SENSOR_WRITE_TOKEN` lines to place in `secrets.h`. The generated account ID is the sign-in ID in the phone app; the ESP32 uses its paired device ID and write key.

The ESP32 posts JSON to `/api/device/{device-id}/telemetry` with `Authorization: Bearer {device-write-key}` and `Content-Type: application/json`:

```json
{
  "velocity_mps": -0.42,
  "target_present": true,
  "timestamp": "2026-10-26T12:34:56Z",
  "direction": "Moving away from sensor"
}
```

`timestamp` and `direction` are optional; the Worker supplies its own timestamp when omitted. The write key is unique to that device and is shown once during pairing. Keep it in the private `secrets.h` file, not in public code.

## Connect the ESP32-S3 firmware

The supplied `code.ino` reads the DFRobot C4001 velocity and now publishes it to the relay every three seconds from a separate FreeRTOS task. This keeps the HTTPS request outside the radar and fall-detection loop. When there is no target, it sends zero velocity with `target_present: false`; the app labels that state as **No target detected**. The app marks readings older than 15 seconds as stale.

1. Create an account in the app, then tap **Add sensor** and save the generated device ID and write key.
2. Copy `secrets.h.example` to `secrets.h` in the Arduino sketch folder. Fill in your Wi-Fi name/password, Worker URL, and the paired device ID/write key. `secrets.h` is excluded by `.gitignore`.
3. Add the PEM root CA certificate that verifies the HTTPS certificate for your Worker URL to `SENSOR_ROOT_CA`. The firmware validates TLS and intentionally does not disable certificate checks. Export the root certificate from the verified certificate chain for the deployed Worker hostname.
4. Open `code.ino` in Arduino IDE, select the ESP32-S3 board and port, and upload it. Install the DFRobot C4001 library first.

Each physical sensor needs its own **Add sensor** pairing and its own `secrets.h` values. The app account can list multiple devices and select one to view. The microphone, speaker, and fall alert events are not yet sent to the cloud.

## Use the phone dashboard

The responsive web app is in this folder. Host those files over HTTPS (for example, as a Cloudflare Pages static site). On Android Chrome, choose **Install app** or **Add to Home screen**. Create an account using the Worker URL, save the generated account ID and password, then use **Add sensor** to pair an ESP32.

## Download or rebuild the Android APK

The updated APK is `dist/Hertz-Haven.apk`. It includes the Hertz & Haven logo and green theme. It is debug-signed for direct installation; updating an older copy signed with a different debug key may require uninstalling that copy first. Save your account ID and password before reinstalling. The live website also offers this APK directly from its download section.

The Android Studio project is in `android/`. Open that folder in Android Studio with Android SDK 35 and JDK 17 available, then choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Android Studio places its APK at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The APK in `dist/` was compiled and packaged with the Android SDK and signed with a debug key for direct installation. The app uses the same web dashboard bundled in `android/app/src/main/assets/`.

## Current scope

The monitor currently displays mmWave velocity. The microphone, speaker, and fall-detection events are not connected to the account dashboard yet.
