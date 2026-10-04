import { router, usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';

/** Query string of the current page. Filters live here so a link opens the same view for a friend. */
export function useQuery(): URLSearchParams {
    const { url } = usePage();
    return useMemo(() => new URLSearchParams(url.split('?')[1] ?? ''), [url]);
}

/** Updates the query string without a server visit. Empty values are removed. */
export function useSetQuery() {
    return useCallback((patch: Record<string, string | number | null | undefined>) => {
        const params = new URLSearchParams(window.location.search);
        for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === '') params.delete(k);
            else params.set(k, String(v));
        }
        const qs = params.toString();
        router.replace({ url: window.location.pathname + (qs ? `?${qs}` : ''), preserveState: true, preserveScroll: true });
    }, []);
}
