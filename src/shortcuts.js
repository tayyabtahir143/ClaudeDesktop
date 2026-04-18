import { zoomIn, zoomOut, zoomReset } from './window.js';

export function setupShortcuts(win) {
    const wc = win.webContents;

    wc.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;

        const ctrl = input.control || input.meta;

        if (ctrl && (input.key === '=' || input.key === '+')) {
            zoomIn();
            event.preventDefault();
        } else if (ctrl && input.key === '-') {
            zoomOut();
            event.preventDefault();
        } else if (ctrl && input.key === '0') {
            zoomReset();
            event.preventDefault();
        } else if (ctrl && input.key === 't') {
            wc.loadURL('https://claude.ai/new');
            event.preventDefault();
        } else if ((ctrl && input.key === 'r') || input.key === 'F5') {
            // if showing offline page, go back to claude.ai instead of reloading the file
            if (wc.getURL().startsWith('file://')) {
                wc.loadURL('https://claude.ai');
            } else {
                wc.reload();
            }
            event.preventDefault();
        } else if (input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
            event.preventDefault();
        }
    });
}
