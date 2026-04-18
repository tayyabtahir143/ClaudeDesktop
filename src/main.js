import { app, BrowserWindow, shell, session, Notification } from 'electron';
import path from 'path';
import { config } from './config/index.js';
import { fileURLToPath } from 'url';
import electronContextMenu from 'electron-context-menu';

// Set up the context menu
electronContextMenu({
    showSaveImageAs: true,
});

const appUrl = 'https://claude.ai';

let window = null;

// Calculate __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to create the main application window
const createWindow = () => {
    window = new BrowserWindow({
        icon: path.join(__dirname, 'assets/icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            nativeWindowOpen: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
        },
    });

    // Grant notification permission automatically — claude.ai uses it for response alerts
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'notifications') {
            callback(true);
        } else {
            callback(false);
        }
    });

    // Allow permission checks so Notification.permission returns 'granted'
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'notifications') {
            return true;
        }
        return false;
    });

    window.loadURL(appUrl, {
        userAgent: config.userAgent,
    });

    // Open Google Sign-In in the system browser; allow all other popups
    window.webContents.setWindowOpenHandler((details) => {
        if (details.url.includes('accounts.google.com')) {
            shell.openExternal(details.url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    window.once('ready-to-show', () => {
        window.maximize();
    });
};

// Single instance lock
const appLock = app.requestSingleInstanceLock();

if (!appLock) {
    app.quit();
} else {
    app.on('second-instance', (event, args) => {
        if (window) {
            window.focus();
        }
    });

    app.on('ready', createWindow);

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
