import { app, BrowserWindow, session, globalShortcut } from 'electron';
import electronContextMenu from 'electron-context-menu';
import { createWindow, getWindow } from './window.js';
import { setupTray } from './tray.js';
import { setupShortcuts } from './shortcuts.js';

electronContextMenu({ showSaveImageAs: true });

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        const win = getWindow();
        if (!win) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
    });

    app.whenReady().then(() => {
        // let claude.ai request and use desktop notifications
        session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
            cb(permission === 'notifications');
        });
        session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
            return permission === 'notifications';
        });

        const win = createWindow();
        setupTray(win);
        setupShortcuts(win);
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
}
