import { useSyncExternalStore } from 'react';

/** Colour palettes to try. The values live in app.css under [data-palette]. */
export const PALETTES = [
    { id: 'ember', name: 'Ember', swatch: ['#141414', '#ff7a1a'] },
    { id: 'red', name: 'Deep red', swatch: ['#150b0c', '#9b111e'] },
    { id: 'navy', name: 'Navy', swatch: ['#0d1c42', '#a9bcf5'] },
    { id: 'cobalt', name: 'Cobalt', swatch: ['#1230c9', '#ffe14d'] },
    { id: 'forest', name: 'Forest', swatch: ['#0b3324', '#d3ee6b'] },
    { id: 'pink', name: 'Night pink', swatch: ['#16161f', '#ff7ab3'] },
    { id: 'bahari', name: 'Bahari', swatch: ['#00384f', '#fde14f'] },
] as const;

export type PaletteId = (typeof PALETTES)[number]['id'];

const KEY = 'timbuktu-palette';
const EVENT = 'timbuktu-palette';

function read(): PaletteId {
    const v = document.documentElement.dataset.palette;
    return PALETTES.some((p) => p.id === v) ? (v as PaletteId) : 'ember';
}

export function setPalette(id: PaletteId) {
    document.documentElement.dataset.palette = id;
    try {
        localStorage.setItem(KEY, id);
    } catch {
        // Private browsing: the choice lasts for this visit.
    }
    window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
    window.addEventListener(EVENT, cb);
    return () => window.removeEventListener(EVENT, cb);
}

export function usePalette(): PaletteId {
    return useSyncExternalStore(subscribe, read, () => 'ember');
}

/** The resolved hex value of a palette variable such as --b-900, for WebGL and other non-CSS consumers. */
export function paletteColor(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#0d1c42';
}
