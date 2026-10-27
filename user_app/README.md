# Hertz & Haven phone app for Windows

This Windows installer packages the same sensor dashboard app as the Android APK. It includes cloud account creation and sign-in, device pairing, multichannel sensor status, and the live radial-velocity dashboard. The app keeps its account ID, service URL, and session on the PC, while the account and sensor records remain on the configured cloud service.

## Install

1. Download Hertz-Haven-Setup.exe from the website or the latest GitHub Release.
2. Run the installer and follow the prompts. It creates a Start menu entry and optional desktop shortcut.
3. Open Hertz & Haven and enter the Cloudflare Worker URL for your service.
4. Create an account, or sign in with an existing account ID and password.
5. Pair your ESP32 sensor as usual. Use the same cloud service URL and account to view devices registered on that service.

The Windows installer is unsigned, so Windows SmartScreen may ask you to confirm before running it.

## Build the installer

From the repository root, run:

    npm ci --prefix user_app
    npm run build:windows --prefix user_app

The installer is written to user_app/dist/Hertz-Haven-Setup.exe. GitHub Actions builds and publishes a new installer when the app source changes.

## Data and compatibility

The app uses the same Cloudflare Worker API as Android. The account and sensor records are shared through that cloud service; the saved service URL and session token are stored locally in the Windows app. The installer is currently unsigned and intended for Windows 10 and 11 PCs.
