import { BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { config } from './config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new Store();

const HOME = 'https://claude.ai';

let win = null;
let retryTimer = null;

export function getWindow() {
    return win;
}

export function createWindow() {
    const bounds = store.get('bounds', { width: 1280, height: 800 });

    win = new BrowserWindow({
        ...bounds,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, '../assets/icon.png'),
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            webSecurity: true,
            zoomFactor: store.get('zoom', 1.0),
        },
    });

    win.loadURL(HOME, { userAgent: config.userAgent });

    win.once('ready-to-show', () => {
        store.get('maximized', true) ? win.maximize() : win.show();
    });

    win.on('resize', persistBounds);
    win.on('move', persistBounds);

    // show native offline page if claude.ai fails to load
    win.webContents.on('did-fail-load', (_e, code, _desc, url) => {
        if (code === -3 || !url || !url.startsWith('https://claude.ai')) return;

        win.loadFile(path.join(__dirname, '../offline.html'));

        retryTimer = setInterval(async () => {
            if (!win) return stopRetry();
            try {
                const online = await win.webContents.executeJavaScript('navigator.onLine');
                if (online) {
                    stopRetry();
                    win.loadURL(HOME, { userAgent: config.userAgent });
                }
            } catch (_) {
                stopRetry();
            }
        }, 5000);
    });

    win.webContents.on('did-finish-load', () => {
        if (!win.webContents.getURL().startsWith('file://')) stopRetry();
    });

    // external links (google auth, etc.) open in the system browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://claude.ai')) return { action: 'allow' };
        shell.openExternal(url);
        return { action: 'deny' };
    });

    win.on('closed', () => {
        stopRetry();
        win = null;
    });

    return win;
}

function persistBounds() {
    if (!win || win.isMaximized() || win.isFullScreen()) {
        store.set('maximized', win ? win.isMaximized() : false);
        return;
    }
    store.set('bounds', win.getBounds());
    store.set('maximized', false);
}

function stopRetry() {
    clearInterval(retryTimer);
    retryTimer = null;
}

export function zoomIn() {
    changeZoom(0.1);
}

export function zoomOut() {
    changeZoom(-0.1);
}

export function zoomReset() {
    if (!win) return;
    win.webContents.setZoomFactor(1.0);
    store.set('zoom', 1.0);
}

function changeZoom(delta) {
    if (!win) return;
    const next = Math.min(Math.max(win.webContents.getZoomFactor() + delta, 0.5), 3.0);
    win.webContents.setZoomFactor(next);
    store.set('zoom', next);
}
