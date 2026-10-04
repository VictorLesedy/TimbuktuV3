import { useApp } from '@/store/app-store';
import { GUEST_GROUPS, type GuestGroup, type Listing, type Order, type Review, type Save, type Settings } from '@/types';
import { useMemo } from 'react';
import { DAY, DAY_NAMES, HOUR } from './format';

export const BANDS = ['Morning', 'Afternoon', 'Evening', 'Late'] as const;
export type Band = (typeof BANDS)[number];

export type BadgeKind = 'trending' | 'rising' | 'top-rated' | 'busiest' | 'new';
export interface BadgeInfo {
    kind: BadgeKind;
    label: string;
}

export interface Signals {
    rating: { average: number; count: number };
    /** rhythm[weekday][band], 0 = Sunday, scaled 0..1 against the busiest cell. */
    rhythm: number[][];
    /** Check-ins per weekday over the window. */
    dayTotals: number[];
    checkIns: number;
    peakDay: number | null;
    crowd: { visible: boolean; bookings: number; mix: Record<GuestGroup, number>; averageSpend: number; needed: number };
    momentum: { bookings: number; saves: number; score: number; previous: number };
    repeatRate: number;
    badges: BadgeInfo[];
}

const RHYTHM_WINDOW = 84 * DAY;
const CROWD_WINDOW = 90 * DAY;

/** A night that runs past midnight counts towards the day it started. */
export function bandOf(date: Date): { day: number; band: number } {
    const h = date.getHours();
    if (h < 6) return { day: (date.getDay() + 6) % 7, band: 3 };
    if (h < 12) return { day: date.getDay(), band: 0 };
    if (h < 17) return { day: date.getDay(), band: 1 };
    if (h < 21) return { day: date.getDay(), band: 2 };
    return { day: date.getDay(), band: 3 };
}

function group<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
    const m = new Map<string, T[]>();
    for (const it of items) {
        const k = key(it);
        const list = m.get(k);
        if (list) list.push(it);
        else m.set(k, [it]);
    }
    return m;
}

export function computeSignals(listings: Listing[], orders: Order[], reviews: Review[], saves: Save[], settings: Settings, now = Date.now()): Map<string, Signals> {
    const byListing = group(orders, (o) => o.listingId);
    const reviewsBy = group(reviews, (r) => r.listingId);
    const savesBy = group(saves, (s) => s.listingId);
    const out = new Map<string, Signals>();

    for (const l of listings) {
        const own = byListing.get(l.id) ?? [];
        const rs = reviewsBy.get(l.id) ?? [];
        const sv = savesBy.get(l.id) ?? [];

        const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
        let checkIns = 0;
        for (const o of own) {
            if (!o.checkedInAt) continue;
            const t = new Date(o.checkedInAt);
            if (now - t.getTime() > RHYTHM_WINDOW) continue;
            const { day, band } = bandOf(new Date(o.visitAt));
            grid[day]![band]! += o.guests;
            checkIns++;
        }
        const max = Math.max(1, ...grid.flat());
        const dayTotals = grid.map((row) => row.reduce((a, b) => a + b, 0));
        const total = dayTotals.reduce((a, b) => a + b, 0);
        const peak = dayTotals.indexOf(Math.max(...dayTotals));

        const recent = own.filter((o) => now - new Date(o.createdAt).getTime() <= CROWD_WINDOW);
        const mix = Object.fromEntries(GUEST_GROUPS.map((g) => [g, 0])) as Record<GuestGroup, number>;
        for (const o of recent) mix[o.group] += 1;
        for (const g of GUEST_GROUPS) mix[g] = recent.length ? mix[g] / recent.length : 0;
        const averageSpend = recent.length ? recent.reduce((s, o) => s + o.total + o.dueOnDay, 0) / recent.length : 0;

        const in48 = (iso: string) => now - new Date(iso).getTime() <= 48 * HOUR;
        const inPrev48 = (iso: string) => {
            const d = now - new Date(iso).getTime();
            return d > 48 * HOUR && d <= 96 * HOUR;
        };
        const bookings48 = own.filter((o) => in48(o.createdAt)).length;
        const saves48 = sv.filter((s) => in48(s.at)).length;
        const previous = own.filter((o) => inPrev48(o.createdAt)).length + sv.filter((s) => inPrev48(s.at)).length;

        const fans = group(own, (o) => o.fanId);
        const repeaters = [...fans.values()].filter((list) => list.length > 1).length;

        out.set(l.id, {
            rating: { average: rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0, count: rs.length },
            rhythm: grid.map((row) => row.map((v) => v / max)),
            dayTotals,
            checkIns,
            peakDay: total >= 20 && (dayTotals[peak] ?? 0) / total >= 0.22 ? peak : null,
            crowd: {
                visible: settings.showCrowd && recent.length >= settings.crowdMinBookings,
                bookings: recent.length,
                mix,
                averageSpend,
                needed: settings.crowdMinBookings,
            },
            momentum: { bookings: bookings48, saves: saves48, score: bookings48 + saves48, previous },
            repeatRate: fans.size ? repeaters / fans.size : 0,
            badges: [],
        });
    }

    // Badges are earned against every other live listing, never set by hand.
    const live = listings.filter((l) => l.status === 'live');
    const trending = new Set(
        live
            .map((l) => ({ id: l.id, score: out.get(l.id)!.momentum.score }))
            .filter((x) => x.score >= 6)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((x) => x.id),
    );
    for (const l of live) {
        const s = out.get(l.id)!;
        if (trending.has(l.id)) s.badges.push({ kind: 'trending', label: 'Trending now' });
        else if (s.momentum.score >= 4 && s.momentum.score >= s.momentum.previous * 2) s.badges.push({ kind: 'rising', label: 'Rising' });
        if (s.rating.count >= 8 && s.rating.average >= 4.6) s.badges.push({ kind: 'top-rated', label: 'Top rated' });
        if (s.peakDay !== null) s.badges.push({ kind: 'busiest', label: `Busiest on ${DAY_NAMES[s.peakDay]}s` });
        if (now - new Date(l.createdAt).getTime() <= 21 * DAY) s.badges.push({ kind: 'new', label: 'New on Timbuktu' });
    }
    return out;
}

export function useSignals(): Map<string, Signals> {
    const listings = useApp((s) => s.listings);
    const orders = useApp((s) => s.orders);
    const reviews = useApp((s) => s.reviews);
    const saves = useApp((s) => s.saves);
    const settings = useApp((s) => s.settings);
    return useMemo(() => computeSignals(listings, orders, reviews, saves, settings), [listings, orders, reviews, saves, settings]);
}

export function useListingSignals(id: string): Signals | undefined {
    return useSignals().get(id);
}

export type Busyness = 'Quiet' | 'Steady' | 'Busy' | 'Very busy';

/** How busy a weekday usually gets, relative to the listing's own busiest day. */
export function busynessOn(signals: Signals, weekday: number): Busyness {
    const max = Math.max(1, ...signals.dayTotals);
    const r = (signals.dayTotals[weekday] ?? 0) / max;
    if (r >= 0.8) return 'Very busy';
    if (r >= 0.5) return 'Busy';
    if (r >= 0.2) return 'Steady';
    return 'Quiet';
}

/** Lowest price a fan could pay, for cards and sorting. */
export function priceFrom(l: Listing): number {
    if (l.event) return Math.min(...l.event.tiers.map((t) => t.price));
    if (l.venue) return Math.min(...l.venue.options.map((o) => o.price));
    if (l.service) return l.service.pricePerPerson;
    return l.professional?.rateFrom ?? 0;
}
