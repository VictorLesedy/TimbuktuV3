import type { Kind, Listing } from '@/types';
import type { Signals } from './signals';

/**
 * Pick the listings the home page uses as examples from whatever is live, so nothing
 * depends on a particular listing existing. Each returns undefined when nothing fits,
 * and the section using it leaves that example out.
 */
export function nextEvent(live: Listing[], now = Date.now()): Listing | undefined {
    const upcoming = live.filter((l) => l.event && new Date(l.event.startsAt).getTime() > now).sort((a, b) => a.event!.startsAt.localeCompare(b.event!.startsAt));
    return upcoming.find((l) => l.featured) ?? upcoming[0];
}

/** The listing of a kind with the most check-ins, the best proof that people actually go. */
export function busiest(live: Listing[], signals: Map<string, Signals>, kind: Kind): Listing | undefined {
    return live
        .filter((l) => l.kind === kind && (signals.get(l.id)?.checkIns ?? 0) > 0)
        .sort((a, b) => (signals.get(b.id)?.checkIns ?? 0) - (signals.get(a.id)?.checkIns ?? 0))[0];
}

/** The best-reviewed listing of a kind, falling back to the newest when none has reviews yet. */
export function topRated(live: Listing[], signals: Map<string, Signals>, kind: Kind): Listing | undefined {
    const ofKind = live.filter((l) => l.kind === kind);
    const score = (l: Listing) => {
        const r = signals.get(l.id)?.rating;
        return r && r.count ? r.average * Math.min(1, r.count / 5) : 0;
    };
    return [...ofKind].sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt))[0];
}
