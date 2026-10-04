import type { Kind, Listing } from '@/types';
import { DAY, isoDay } from './format';
import { priceFrom, type Signals } from './signals';

export type When = 'any' | 'today' | 'tomorrow' | 'weekend';
export type Sort = 'trending' | 'rating' | 'nearest' | 'newest' | 'soonest';

export interface BrowseFilters {
    q: string;
    kind: Kind | null;
    city: string;
    when: When;
    date: string;
    min: number;
    max: number;
    busy: number | null;
    sort: Sort;
}

export const PRICE_STEPS = [0, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000];

export const EMPTY_FILTERS: BrowseFilters = { q: '', kind: null, city: '', when: 'any', date: '', min: 0, max: PRICE_STEPS.at(-1)!, busy: null, sort: 'soonest' };

/** Whether a listing can be booked on a given day (yyyy-mm-dd). */
export function availableOn(l: Listing, day: string): boolean {
    const weekday = new Date(`${day}T12:00:00`).getDay();
    if (l.event) return isoDay(new Date(l.event.startsAt)) === day;
    if (l.venue) return !l.venue.closedOn.includes(weekday);
    if (l.service) return l.service.days.includes(weekday);
    return !l.professional?.unavailable.includes(day);
}

/** The days a "when" choice covers, as yyyy-mm-dd. */
export function daysFor(when: When, date: string, now = Date.now()): string[] {
    if (date) return [date];
    if (when === 'today') return [isoDay(now)];
    if (when === 'tomorrow') return [isoDay(now + DAY)];
    if (when === 'weekend') {
        const days: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(now + i * DAY);
            if (d.getDay() === 5 || d.getDay() === 6 || d.getDay() === 0) days.push(isoDay(d));
        }
        return days.slice(0, 3);
    }
    return [];
}

export function filterListings(listings: Listing[], signals: Map<string, Signals>, f: BrowseFilters): Listing[] {
    const needle = f.q.trim().toLowerCase();
    const days = daysFor(f.when, f.date);
    const out = listings.filter((l) => {
        if (l.status !== 'live') return false;
        if (f.kind && l.kind !== f.kind) return false;
        if (f.city && l.city !== f.city) return false;
        if (days.length && !days.some((d) => availableOn(l, d))) return false;
        const price = priceFrom(l);
        if (price < f.min || price > f.max) return false;
        if (f.busy !== null && signals.get(l.id)?.peakDay !== f.busy) return false;
        if (needle) {
            const hay = `${l.title} ${l.area} ${l.city} ${l.category} ${l.summary}`.toLowerCase();
            if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
        }
        return true;
    });
    const s = (l: Listing) => signals.get(l.id)!;
    // Events by date; everything else after them, busiest first.
    const soon = (l: Listing) => (l.event ? new Date(l.event.startsAt).getTime() : Number.MAX_SAFE_INTEGER - s(l).checkIns);
    const sorters: Record<Sort, (a: Listing, b: Listing) => number> = {
        soonest: (a, b) => soon(a) - soon(b),
        trending: (a, b) => s(b).momentum.score - s(a).momentum.score || s(b).checkIns - s(a).checkIns,
        rating: (a, b) => s(b).rating.average - s(a).rating.average || s(b).rating.count - s(a).rating.count,
        nearest: (a, b) => a.distanceKm - b.distanceKm,
        newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return out.sort(sorters[f.sort]);
}

/** The same search as an Explore link, so the full page opens exactly where the home page left off. */
export function exploreHref(f: BrowseFilters): string {
    const p = new URLSearchParams();
    if (f.q.trim()) p.set('q', f.q.trim());
    if (f.kind) p.set('kind', f.kind);
    if (f.city) p.set('city', f.city);
    const days = daysFor(f.when, f.date);
    if (days.length === 1) p.set('date', days[0]!);
    if (f.min > 0) p.set('min', String(f.min));
    if (f.max < PRICE_STEPS.at(-1)!) p.set('max', String(f.max));
    if (f.busy !== null) p.set('busy', String(f.busy));
    if (f.sort !== 'soonest' && f.sort !== 'trending') p.set('sort', f.sort);
    const qs = p.toString();
    return `/explore${qs ? `?${qs}` : ''}`;
}
