# Hertz & Haven — Desktop App

Electron shell for the Hertz & Haven care platform. The UI lives in `../web`
(React + Vite + Tailwind + HeroUI) and is loaded by Electron — there is no
duplicated HTML in this folder.

## Run the built app

```bash
# from the repository root
cd web && npm install && npm run build

# then
cd ../user_app
npm install
npm start
```

`npm start` loads `web/dist/index.html` over `file://`, so the app uses hash
routing (`#/login`, `#/dashboard`, …).

## Run against the dev server (hot reload)

```bash
# terminal 1
cd web && npm run dev          # http://localhost:5173

# terminal 2
cd user_app && npm run dev
```

## Demo accounts

| Role     | Email                             | Password       |
| -------- | --------------------------------- | -------------- |
| Caregiver| rishabh.sharma@hertzandhaven.app  | rishabh@402    |
| Moderator| moderator@hertzandhaven.app       | moderator@402  |

Both are also reachable with one tap from the login screen. The moderator
console is part of this app (`#/dashboard`) and is role-gated; the old
`moderator_app` folder has been removed.

## Layout

- `main.js` — window bootstrap, dev/prod switching, IPC handlers
- `preload.js` — context-isolated `window.electronAPI` bridge
- `auth-store.js` — local account/session store (`data/auth-db.json`)
- `sample-plan.js` — generated floor plan + sensor layout
