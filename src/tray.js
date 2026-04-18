import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let tray = null;

export function setupTray(win) {
    const icon = nativeImage
        .createFromPath(path.join(__dirname, '../assets/icon.png'))
        .resize({ width: 22, height: 22 });

    tray = new Tray(icon);
    tray.setToolTip('Claude Desktop');

    tray.setContextMenu(Menu.buildFromTemplate([
        {
            label: 'Show Window',
            click() { win.show(); win.focus(); },
        },
        {
            label: 'New Chat',
            click() {
                win.show();
                win.focus();
                win.webContents.loadURL('https://claude.ai/new');
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click() { app.quit(); },
        },
    ]));

    tray.on('click', () => {
        if (win.isVisible() && !win.isMinimized()) {
            win.hide();
        } else {
            win.show();
            win.focus();
        }
    });
}
