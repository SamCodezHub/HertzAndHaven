const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const PHONE_APP_INDEX = app.isPackaged
    ? path.join(process.resourcesPath, 'phone-app', 'index.html')
    : path.join(__dirname, '..', 'app', 'index.html');

function createWindow() {
    Menu.setApplicationMenu(null);

    const mainWindow = new BrowserWindow({
        width: 980,
        height: 900,
        minWidth: 500,
        minHeight: 650,
        backgroundColor: '#F7F5EF',
        autoHideMenuBar: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://')) shell.openExternal(url);
        return { action: 'deny' };
    });

    if (!fs.existsSync(PHONE_APP_INDEX)) {
        dialog.showErrorBox(
            'App files missing',
            'The Hertz & Haven phone app could not be found. Reinstall the app or rebuild the Windows installer.'
        );
        app.quit();
        return;
    }

    mainWindow.loadFile(PHONE_APP_INDEX);
}

app.whenReady().then(() => {
    app.setAppUserModelId('app.hertzandhaven.desktop');
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
