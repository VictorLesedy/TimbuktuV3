import { useApp } from '@/store/app-store';
import { useSyncExternalStore } from 'react';

/**
 * Whether the store has loaded the visitor's saved data. Pages show skeletons until it
 * has; when the data comes from Laravel instead, those same skeletons become the
 * fallbacks of Inertia's <Deferred>.
 */
export function useHydrated(): boolean {
    return useSyncExternalStore(
        (cb) => useApp.persist.onFinishHydration(cb),
        () => useApp.persist.hasHydrated(),
        () => false,
    );
}
