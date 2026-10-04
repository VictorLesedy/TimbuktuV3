import { useSyncExternalStore } from 'react';

export type Mode = 'light' | 'dark';
export type ModeChoice = Mode | 'system';

const KEY = 'timbuktu-mode';
const EVENT = 'timbuktu-mode';
const CANVAS: Record<Mode, string> = { light: '#f4f5f7', dark: '#0a0a0a' };

const systemMode = (): Mode => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function readChoice(): ModeChoice {
    try {
        const v = localStorage.getItem(KEY);
        // Light by default; dark or following the system only when picked.
        return v === 'light' || v === 'dark' || v === 'system' ? v : 'light';
    } catch {
        return 'light';
    }
}

function apply(choice: ModeChoice) {
    const mode = choice === 'system' ? systemMode() : choice;
    document.documentElement.dataset.mode = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CANVAS[mode]);
}

export function setMode(choice: ModeChoice) {
    try {
        localStorage.setItem(KEY, choice);
    } catch {
        // Private browsing: the choice lasts for this visit.
    }
    apply(choice);
    window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
        if (readChoice() === 'system') apply('system');
        cb();
    };
    window.addEventListener(EVENT, cb);
    media.addEventListener('change', onSystem);
    return () => {
        window.removeEventListener(EVENT, cb);
        media.removeEventListener('change', onSystem);
    };
}

/** The mode in effect right now. */
export function useMode(): Mode {
    return useSyncExternalStore(subscribe, () => (document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light'), () => 'light');
}

/** What the person picked: light, dark, or follow the system. */
export function useModeChoice(): ModeChoice {
    return useSyncExternalStore(subscribe, readChoice, () => 'light');
}
