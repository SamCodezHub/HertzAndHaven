const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const auth = require('./auth-store');
const schematic = require('./sample-plan');

/** Vite dev server (set by `npm run dev`, or pass --dev). */
const DEV_SERVER_URL =
    process.env.VITE_DEV_SERVER_URL ||
    (process.argv.includes('--dev') ? 'http://localhost:5173' : null);

/** Production bundle produced by `npm run build` in ../web. */
const APP_INDEX = path.join(__dirname, '..', 'web', 'dist', 'index.html');

const senderSessions = new Map();

function tokenFor(event) {
    return senderSessions.get(event.sender.id) || null;
}

function safe(fn) {
    try {
        return fn();
    } catch (err) {
        console.error('[main]', err);
        return { success: false, message: 'Something went wrong. Please try again.' };
    }
}

function startHashFor(boot) {
    if (!boot) return '/';
    if (boot.user.role === 'moderator') return '/dashboard';
    if (!boot.profile || !boot.profile.onboarding || !boot.profile.onboarding.completed) return '/onboarding';
    return '/family-dashboard';
}

function createWindow() {
    Menu.setApplicationMenu(null);

    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 840,
        minWidth: 1024,
        minHeight: 700,
        backgroundColor: '#E9F0F4',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (DEV_SERVER_URL) {
        mainWindow.loadURL(DEV_SERVER_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
        return;
    }

    if (!fs.existsSync(APP_INDEX)) {
        dialog.showErrorBox(
            'Build not found',
            'The web bundle is missing.\n\nRun "npm run build" inside the web/ folder, then relaunch the app.'
        );
        return;
    }

    mainWindow.loadFile(APP_INDEX, { hash: startHashFor(auth.bootSession()) });
}

app.whenReady().then(() => {
    auth.initStore();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('auth:login', (event, payload) => safe(() => {
    const res = auth.login(payload || {});
    if (res.success) senderSessions.set(event.sender.id, res.session.token);
    return res;
}));

ipcMain.handle('auth:register', (event, payload) => safe(() => {
    const res = auth.register(payload || {});
    if (res.success) senderSessions.set(event.sender.id, res.session.token);
    return res;
}));

ipcMain.handle('auth:demo-login', (event, role) => safe(() => {
    const res = auth.demoLogin(role);
    if (res.success) senderSessions.set(event.sender.id, res.session.token);
    return res;
}));

ipcMain.handle('auth:session', (event) => safe(() => {
    return auth.resolveSession(tokenFor(event));
}));

ipcMain.handle('auth:profile', (event) => safe(() => {
    return auth.profileForToken(tokenFor(event));
}));

ipcMain.handle('auth:update-profile', (event, patch) => safe(() => {
    return auth.updateProfileForToken(tokenFor(event), patch);
}));

ipcMain.handle('auth:sign-out', (event) => safe(() => {
    const res = auth.signOutToken(tokenFor(event));
    senderSessions.delete(event.sender.id);
    return res;
}));

ipcMain.handle('schematic:sample', () => safe(() => {
    return { success: true, dataUrl: schematic.samplePlanDataUrl() };
}));

ipcMain.handle('schematic:analyze', (event, payload) => safe(() => {
    const seed = (payload && payload.seed) || String(Date.now());
    const res = schematic.analyzeSchematic(seed);
    return { success: true, sensors: res.sensors, scanLog: res.scanLog };
}));

ipcMain.handle('onboarding:complete', (event, payload) => safe(() => {
    const res = auth.completeOnboardingForToken(tokenFor(event), payload);
    if (res.success && res.session && res.session.token) {
        senderSessions.set(event.sender.id, res.session.token);
    }
    return res;
}));
