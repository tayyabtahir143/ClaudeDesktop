import { app, BrowserWindow, session, globalShortcut } from 'electron';
import electronContextMenu from 'electron-context-menu';
import { createWindow, getMainWindow } from './window.js';
import { setupTray } from './tray.js';
import { registerShortcuts } from './shortcuts.js';

electronContextMenu({ showSaveImageAs: true });

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const win = getMainWindow();
        if (!win) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    });

    app.whenReady().then(() => {
        session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
            callback(permission === 'notifications');
        });

        session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
            return permission === 'notifications';
        });

        const win = createWindow();
        setupTray(win);
        registerShortcuts(win);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
}
