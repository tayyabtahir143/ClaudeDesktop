import { BrowserWindow, shell, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { config } from './config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const store = new Store();
const APP_URL = 'https://claude.ai';

let mainWindow = null;
let retryTimer = null;

export function getMainWindow() {
    return mainWindow;
}

function savedBounds() {
    return store.get('windowBounds', { width: 1280, height: 800 });
}

function persistBounds(win) {
    if (!win.isMaximized() && !win.isFullScreen()) {
        store.set('windowBounds', win.getBounds());
    }
    store.set('windowMaximized', win.isMaximized());
}

function clearRetryTimer() {
    if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
    }
}

function startRetryTimer(win) {
    clearRetryTimer();
    retryTimer = setInterval(() => {
        if (!mainWindow) {
            clearRetryTimer();
            return;
        }
        mainWindow.webContents
            .executeJavaScript('navigator.onLine')
            .then(online => {
                if (online) {
                    clearRetryTimer();
                    win.loadURL(APP_URL, { userAgent: config.userAgent });
                }
            })
            .catch(clearRetryTimer);
    }, 5000);
}

export function createWindow() {
    const bounds = savedBounds();
    const wasMaximized = store.get('windowMaximized', true);
    const zoomFactor = store.get('zoomFactor', 1.0);

    mainWindow = new BrowserWindow({
        ...bounds,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '..', 'preload.js'),
            webSecurity: true,
            zoomFactor,
        },
    });

    mainWindow.loadURL(APP_URL, { userAgent: config.userAgent });

    mainWindow.once('ready-to-show', () => {
        wasMaximized ? mainWindow.maximize() : mainWindow.show();
    });

    ['resize', 'move'].forEach(ev => {
        mainWindow.on(ev, () => persistBounds(mainWindow));
    });

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, _desc, failedUrl) => {
        // code -3 is ERR_ABORTED (e.g. navigation cancelled), not a real failure
        if (errorCode === -3) return;
        if (failedUrl && failedUrl.startsWith('https://claude.ai')) {
            mainWindow.loadFile(path.join(__dirname, '..', 'offline.html'));
            startRetryTimer(mainWindow);
        }
    });

    mainWindow.webContents.on('did-finish-load', () => {
        const url = mainWindow.webContents.getURL();
        if (!url.startsWith('file://')) {
            clearRetryTimer();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://claude.ai')) {
            return { action: 'allow' };
        }
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        clearRetryTimer();
        mainWindow = null;
    });

    return mainWindow;
}

export function setZoom(factor) {
    if (!mainWindow) return;
    const clamped = Math.min(Math.max(factor, 0.5), 3.0);
    mainWindow.webContents.setZoomFactor(clamped);
    store.set('zoomFactor', clamped);
}

export function getZoom() {
    if (!mainWindow) return 1.0;
    return mainWindow.webContents.getZoomFactor();
}
