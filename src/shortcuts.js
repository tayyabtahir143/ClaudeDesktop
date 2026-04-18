import { setZoom, getZoom } from './window.js';

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

export function registerShortcuts(win) {
    const wc = win.webContents;

    wc.on('before-input-event', (event, input) => {
        if (!input.type === 'keyDown') return;

        const ctrl = input.control || input.meta;

        // Zoom in: Ctrl+= or Ctrl++
        if (ctrl && (input.key === '=' || input.key === '+')) {
            setZoom(Math.min(getZoom() + ZOOM_STEP, ZOOM_MAX));
            event.preventDefault();
            return;
        }

        // Zoom out: Ctrl+-
        if (ctrl && input.key === '-') {
            setZoom(Math.max(getZoom() - ZOOM_STEP, ZOOM_MIN));
            event.preventDefault();
            return;
        }

        // Reset zoom: Ctrl+0
        if (ctrl && input.key === '0') {
            setZoom(1.0);
            event.preventDefault();
            return;
        }

        // New chat: Ctrl+T
        if (ctrl && input.key === 't') {
            wc.loadURL('https://claude.ai/new');
            event.preventDefault();
            return;
        }

        // Reload page: Ctrl+R or F5
        if ((ctrl && input.key === 'r') || input.key === 'F5') {
            const url = wc.getURL();
            if (!url.startsWith('file://')) {
                wc.reload();
            } else {
                wc.loadURL('https://claude.ai');
            }
            event.preventDefault();
            return;
        }

        // Toggle fullscreen: F11
        if (input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
            event.preventDefault();
        }
    });
}
