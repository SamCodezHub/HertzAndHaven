# Hertz & Haven — Windows desktop app

The Windows app packages the same React dashboard used by the desktop shell, including account creation and sign-in, onboarding, the family dashboard, and the moderator console. Electron presents the UI in a native desktop window. Accounts and profile data are stored on that Windows computer in Electron's user data folder.

## Build the installer

From the repository root, run:

    npm ci --prefix web
    npm ci --prefix user_app
    npm run build:windows --prefix user_app

The installer is written to user_app/dist/Hertz-Haven-Setup.exe. GitHub Actions runs the same build for updates and publishes the installer to the latest GitHub Release.

To run the app locally without building the installer, build the web UI first, then run npm start --prefix user_app. Electron loads web/dist/index.html over file:// and uses hash routes such as #/login and #/dashboard.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Caregiver | rishabh.sharma@hertzandhaven.app | rishabh@402 |
| Moderator | moderator@hertzandhaven.app | moderator@402 |

Both accounts are available through the login screen's demo sign-in buttons.

## Windows app data and cloud connection

The packaged app stores its local account database in %APPDATA%\hertz-and-haven\data. Uninstalling the app does not normally remove that user data. The desktop account store is local to this computer and does not sync with the Android app. Live sensor readings still require a separately deployed cloud relay and firmware configured for that relay.

The installer is currently unsigned. Windows SmartScreen may ask you to confirm before running it.

## Layout

- main.js — Electron window and native account handlers
- preload.js — context-isolated app bridge
- auth-store.js — local account and session database
- sample-plan.js — generated sample floor plan and sensor layout
