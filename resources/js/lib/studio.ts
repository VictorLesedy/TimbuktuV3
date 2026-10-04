import { useApp } from '@/store/app-store';
import type { Listing, Order } from '@/types';
import { useMemo } from 'react';

/** The signed-in entertainer's listings and the orders made on them. */
export function useHostData() {
    const hostId = useApp((s) => s.session.hostId);
    const listings = useApp((s) => s.listings);
    const orders = useApp((s) => s.orders);
    return useMemo(() => {
        const own = listings.filter((l) => l.hostId === hostId);
        const ids = new Set(own.map((l) => l.id));
        const byId = new Map<string, Listing>(own.map((l) => [l.id, l]));
        const sales: Order[] = orders.filter((o) => ids.has(o.listingId));
        return { hostId, listings: own, byId, orders: sales };
    }, [hostId, listings, orders]);
}
