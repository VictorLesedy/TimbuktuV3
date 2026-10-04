import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void) {
    const media = window.matchMedia(query);
    media.addEventListener('change', cb);
    return () => media.removeEventListener('change', cb);
}

export function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
