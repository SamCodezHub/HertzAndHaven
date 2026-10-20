# Elderly Accident Prevention System

An intelligent monitoring and emergency response system for elderly individuals, combining mmWave radar sensors with real-time caregiver and moderator dashboards. Designed for deployment in Bangalore, India.

## Overview

The system detects falls and anomalous movements using mmWave radar sensors mounted in monitored areas. Caregivers register through a dedicated app, upload a floor plan, and receive AI-placed sensor recommendations. When an anomaly is detected, a moderator is alerted through a dispatcher dashboard and can deploy healthcare teams. Teams follow real Bangalore road routes to reach patients and transport them to the nearest hospital, with all movement tracked live on a map.

## Architecture

```
ElderlyAccidentPrevention101/
├── user_app/                 # Electron shell (loads the React UI from web/)
│   ├── main.js               # Electron main process, dev/prod loading, IPC
│   ├── preload.js            # Context bridge (auth, profile, onboarding)
│   ├── auth-store.js         # Authentication, sessions, scrypt hashing
│   ├── sample-plan.js        # Sample floor plan SVG & AI sensor placement
│   ├── data/                 # Local account/session store
│   └── package.json
├── web/                      # React 19 + Vite + Tailwind v4 + HeroUI UI
│   ├── src/pages/            # Landing, Login, Onboarding, dashboards
│   ├── src/components/       # family/ and moderator/ component folders
│   ├── src/lib/              # API bridge, geo helpers, dispatch data
│   ├── src/styles/           # Console (Leaflet/dark theme) styles
│   └── vite.config.ts        # base './' so the build runs from file://
├── web_app/                  # Legacy static browser build (Vercel)
├── pi_backend/               # Raspberry Pi Zero 2W sensor backend
│   ├── server.py             # Sensor data collection & transmission
│   ├── mmwave_reader.py      # mmWave radar serial parser & anomaly detection
│   ├── qr_generator.py       # Device registration QR code generator
│   ├── config.py             # Device configuration management
│   └── requirements.txt
└── README.md
```

## Components

### Caregiver App (user_app + web)

The Electron shell in `user_app/` hosts the React application in `web/`. There is
no duplicated HTML — the desktop window loads `web/dist/index.html` over
`file://` (hash routing), or the Vite dev server during development.

**Features:**

- **Login & Registration** — Email/phone-based authentication with scrypt password hashing, session tokens, and remember-me support. One-tap demo access for both roles.
- **Onboarding Wizard** — Multi-step home setup:
  - Senior profile (name, age, medical conditions, mobility level, language)
  - Emergency contacts and physician details
  - Residence information (building type, floor, lockbox details)
  - Floor plan upload with AI-powered sensor placement analysis
- **Floor Plan Analysis** — Upload a floor plan image and receive AI-generated sensor placement recommendations. The system classifies zones by risk level (critical / high / medium / low) and places mmWave sensors optimally.
- **Family Dashboard** — Monitoring view showing senior status, sensor health, hardware state (mmWave radar, smart lock), and notification preferences.
- **Smart Lock Integration** — Rotating OTP generation for smart lock access with configurable rotation intervals.
- **Role Routing** — Moderators are routed to the dispatch console at `#/dashboard`; caregivers continue to onboarding or the family dashboard.
- **Demo Mode** — Pre-seeded demo accounts with a complete 2BHK floor plan, 5 placed sensors, and populated senior profile.

**Demo Credentials:**

| Role | Name | Email | Password |
|---|---|---|---|
| Caregiver | `Rishabh Sharma` | `rishabh.sharma@hertzandhaven.app` | `rishabh@402` |
| Moderator | `Ops Desk` | `moderator@hertzandhaven.app` | `moderator@402` |

### Moderator Dashboard (in-app)

The dispatcher UI is part of the same application (`#/dashboard`), gated by role.
The former standalone `moderator_app/` has been removed.

**Features:**

- **Map View** — Leaflet map centered on Bangalore with OpenStreetMap tiles. Displays sensor devices, healthcare teams, hospitals, and active alerts with distinct markers and a map legend.
- **Alert Management** — Trigger alerts from sensor devices. Each alert shows in a sidebar list with status badges (Active / Transport / Resolved). Alerts can be classified as false or actual threats.
- **Device Communication** — Call the device at the alert location to confirm the situation. Send pre-filled SMS messages to the device owner.
- **Healthcare Team Dispatch** — 8 healthcare teams patrol along real Bangalore roads (OSRM routing). The nearest available team is identified by distance. Deploy a team to an alert and track their movement in real-time.
- **Hospital Transport** — Automatically selects the nearest hospital from 6 real Bangalore hospital locations. Transport is animated along actual road routes with real-time ETA countdown matching the calculated travel time (1 second of animation per 1 minute of ETA).
- **Live Feed** — Timestamped feed messages showing team status, traffic updates, and hospital handoff events during active transports.

**Color Scheme:**

| Element | Color |
|---|---|
| Sensor devices | Purple `#6c5ce7` |
| Active alerts | Coral `#fd79a8` |
| Healthcare teams | Blue `#0984e3` |
| Deployed teams | Gold `#fdcb6e` |
| Hospitals | Orange `#e17055` |
| Success actions | Teal `#00cec9` |

### Pi Backend (Sensor Node)

A Python backend designed to run on a Raspberry Pi Zero 2W connected to a TI mmWave radar sensor (e.g., AWR1642).

**Features:**

- **mmWave Data Parsing** — Reads serial data from the radar sensor, parsing TLV frames into 3D point clouds (x, y, z, velocity, doppler).
- **Anomaly Detection** — Two detection algorithms:
  - *Velocity Spike* — Flags points exceeding a configurable velocity threshold that also deviate significantly from the recent baseline.
  - *Sudden Change* — Detects abrupt shifts in average movement speed by comparing short-term and long-term velocity windows.
- **Data Transmission** — Sends point cloud data and detected anomalies to the moderator dashboard via HTTP POST.
- **Demo Mode** — Generates simulated point cloud data with periodic anomalies for testing without hardware.
- **QR Registration** — Generates a QR code containing device configuration for easy registration through the dashboard.

**Sensor Configuration:**

| Parameter | Default |
|---|---|
| Serial Port | `/dev/ttyUSB0` |
| Baud Rate | 115200 |
| Velocity Threshold | 0.5 m/s |
| Detection Range | 5.0 m |
| Update Rate | 10 Hz |

## Web / Vercel versions (no Electron)

Two browser builds exist:

- **`web/`** — the current React application (React 19 + Vite + Tailwind CSS v4 +
  HeroUI). It runs standalone in any modern browser and is what the Electron
  shell loads.

  ```bash
  cd web
  npm install
  npm run dev       # http://localhost:5173
  npm run build     # dist/ built for Electron (relative asset paths)
  npm run build:web # dist/ built for Vercel (absolute paths + SPA routing)
  ```

- **`web_app/`** — the legacy static caregiver build with a `localStorage` +
  Web Crypto implementation (`web_app/src/app.js`), deployable to Vercel with no
  server. The UI uses the `#96B7C8` blue-gray color theme.

  ```bash
  cd web_app
  npx vercel          # deploy
  ```

### Deploying the new UI to Vercel

The Vercel project must be pointed at `web/`, not `web_app/`:

1. Vercel → Project → **Settings → Build & Deployment**
2. **Root Directory** → `web` (Enable "Include source files outside of the Root
   Directory" only if prompted — not required here)
3. Framework Preset → **Vite**
4. Build Command → `npm run build:web`
5. Output Directory → `dist`
6. Redeploy (Deployments → ⋯ → Redeploy, uncheck "Use existing build cache")

`web/vercel.json` already declares those values, so setting the Root Directory
to `web` is normally the only step needed. A root-level `vercel.json` is also
included for projects whose Root Directory is the repository root.

Full `web_app` details live in `web_app/README.md`; its unit harness runs with
`node web_app/test/harness.js`.

## Setup

### Prerequisites

- **Node.js** (v18+) and npm
- **Python 3.8+** (for pi_backend)
- **TI mmWave radar sensor** (optional, for real hardware)

### Desktop App (Electron + React)

```bash
# 1. build the React UI
cd web
npm install
npm run build

# 2. launch the desktop shell
cd ../user_app
npm install
npm start
```

### Desktop App (hot reload)

```bash
# terminal 1
cd web && npm run dev

# terminal 2
cd user_app && npm run dev
```

### Moderator Console

No separate app — sign in as the moderator (or use *Open Moderator Console* on
the login screen) and the app routes to `#/dashboard`.

### Pi Backend

```bash
cd pi_backend
pip install -r requirements.txt
python server.py
```

Choose mode when prompted:
1. **Real sensor** — Connects to mmWave hardware over serial
2. **Demo mode** — Simulated data for testing
3. **QR code** — Generate device registration QR code

## Configuration

### Pi Backend

Edit `pi_backend/config.py` or let it auto-generate `device_config.json` on first run. Key settings:

- `app_host` — URL of the moderator dashboard backend (e.g., `http://192.168.1.100:3847`)
- `device_id` — Unique identifier auto-generated as `pi_<hex>`
- `velocity_threshold` — Minimum velocity (m/s) to flag as potential anomaly

### Caregiver App

User data is stored in `user_app/data/auth-db.json`. Session tokens and scrypt
password hashing are handled in `auth-store.js`; the React layer reaches them
through the `window.electronAPI` bridge in `user_app/preload.js`. When the same
build runs in a plain browser, `web/src/lib/api.ts` provides an equivalent
`localStorage` + Web Crypto implementation.

### Moderator Console

Moderator accounts live in the same store (`user_app/data/auth-db.json`). A demo
moderator is seeded automatically on first launch.

## Technologies

- **Electron** — Desktop shell hosting the React build
- **React 19 + Vite** — UI runtime and build tooling
- **Tailwind CSS v4 + HeroUI** — Design system and component primitives
- **Leaflet** — Interactive map with OpenStreetMap tiles
- **OSRM** — Open Source Routing Machine for real road route calculations
- **Node.js crypto** — scrypt password hashing, session tokens, OTP generation
- **Python** — Sensor backend
- **pyserial** — Serial communication with mmWave radar
- **NumPy** — Statistical anomaly detection
- **SVG** — Floor plan rendering and sensor overlay visualization
