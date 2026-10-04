import { createWorld, DEMO_FAN_ID, STUDIO_HOST_ID, type World } from '@/data/seed';
import { DAY, isoDay } from '@/lib/format';
import { splitOrder } from '@/lib/ledger';
import { code, createRng } from '@/lib/rng';
import type { City, GuestGroup, HireRequest, Interest, Level, Listing, Network, Order, OrderLine, Payout, Role, Settings } from '@/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface Session {
    role: Role;
    signedIn: boolean;
    fanId: string;
    hostId: string;
    /** Ambassador code from a ?ref= link, credited on the next paid order. */
    referralCode: string | null;
}

export interface NewOrder {
    listingId: string;
    lines: OrderLine[];
    guests: number;
    group: GuestGroup;
    subtotal: number;
    discount: number;
    promo?: string;
    total: number;
    dueOnDay: number;
    network: Network;
    phone: string;
    visitAt: string;
    hireRequestId?: string;
}

export type CheckInResult =
    | { status: 'ok'; order: Order }
    | { status: 'already'; order: Order }
    | { status: 'wrong-listing'; order: Order }
    | { status: 'not-today'; order: Order }
    | { status: 'unknown' };

interface Actions {
    resetDemo: () => void;
    setRole: (role: Role) => void;
    setFanLevel: (level: Level | 'signed-out') => void;
    captureReferral: (code: string) => void;
    toggleSave: (listingId: string) => void;
    recordShare: (listingId: string) => void;
    quickRegister: (name: string, phone: string) => void;
    completeFanOnboarding: (data: { name: string; phone: string; city: City; artists: string[]; interests: Interest[]; level: Level }) => void;
    registerEntertainer: (data: { name: string; phone: string; city: City; bio: string }) => void;
    joinAmbassador: () => void;
    placeOrder: (input: NewOrder) => Order;
    addReview: (orderId: string, rating: number, text: string) => void;
    requestHire: (input: Pick<HireRequest, 'listingId' | 'date' | 'location' | 'hours' | 'budget' | 'message'>) => HireRequest;
    sendQuote: (id: string, quote: NonNullable<HireRequest['quote']>) => void;
    declineHire: (id: string, reason: string) => void;
    checkIn: (code: string, listingId: string, day: string) => CheckInResult;
    submitListing: (listing: Listing) => void;
    approveListing: (id: string) => void;
    requestListingChanges: (id: string, note: string) => void;
    rejectListing: (id: string, note: string) => void;
    setFeatured: (id: string, featured: boolean) => void;
    setPaused: (id: string, paused: boolean) => void;
    reviewHost: (id: string, decision: 'approved' | 'changes_requested' | 'rejected', note?: string) => void;
    updateSettings: (patch: Partial<Settings>) => void;
    withdraw: (payout: Omit<Payout, 'id' | 'at'>) => Payout;
}

export type AppState = World & { session: Session } & Actions;

const freshSession = (): Session => ({ role: 'fan', signedIn: true, fanId: DEMO_FAN_ID, hostId: STUDIO_HOST_ID, referralCode: null });

// Codes and ids for things made in this browser. Seeded from the clock so they differ from the sample world's.
const rng = createRng(Date.now() % 2147483647);
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.floor(rng.next() * 1e6).toString(36)}`;

export const useApp = create<AppState>()(
    persist(
        (set, get) => {
            const now = () => new Date().toISOString();
            const patchFan = (patch: Partial<World['fans'][number]>) =>
                set((s) => ({ fans: s.fans.map((f) => (f.id === s.session.fanId ? { ...f, ...patch } : f)) }));
            const patchListing = (id: string, patch: Partial<Listing>) =>
                set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
            const patchHire = (id: string, fn: (r: HireRequest) => HireRequest) =>
                set((s) => ({ hireRequests: s.hireRequests.map((r) => (r.id === id ? fn(r) : r)) }));

            return {
                ...createWorld(),
                session: freshSession(),

                resetDemo: () => set({ ...createWorld(), session: freshSession() }),
                setRole: (role) => set((s) => ({ session: { ...s.session, role } })),
                setFanLevel: (level) => {
                    if (level === 'signed-out') return set((s) => ({ session: { ...s.session, signedIn: false } }));
                    set((s) => ({ session: { ...s.session, signedIn: true } }));
                    patchFan({ level });
                },
                captureReferral: (ref) => {
                    const own = get().fans.find((f) => f.id === get().session.fanId)?.referralCode;
                    if (ref && ref !== own) set((s) => ({ session: { ...s.session, referralCode: ref.toUpperCase() } }));
                },
                toggleSave: (listingId) =>
                    set((s) => {
                        const fanId = s.session.fanId;
                        const has = s.saves.some((v) => v.listingId === listingId && v.fanId === fanId);
                        return {
                            saves: has ? s.saves.filter((v) => !(v.listingId === listingId && v.fanId === fanId)) : [...s.saves, { listingId, fanId, at: now() }],
                        };
                    }),
                recordShare: (listingId) => set((s) => ({ shares: [...s.shares, { listingId, fanId: s.session.fanId, at: now() }] })),
                quickRegister: (name, phone) => {
                    set((s) => ({ session: { ...s.session, signedIn: true } }));
                    const fan = get().fans.find((f) => f.id === get().session.fanId);
                    patchFan({ name, phone, level: fan?.level === 'ambassador' ? 'ambassador' : 'member' });
                },
                completeFanOnboarding: ({ name, phone, city, artists, interests, level }) => {
                    set((s) => ({ session: { ...s.session, signedIn: true, role: 'fan' } }));
                    patchFan({ name, phone, city, artists, interests, level });
                },
                registerEntertainer: ({ name, phone, city, bio }) =>
                    set((s) => ({
                        hosts: [
                            ...s.hosts,
                            { id: uid('h'), name, phone, city, bio, verified: false, joinedAt: now(), profileStatus: 'pending' },
                        ],
                    })),
                joinAmbassador: () => patchFan({ level: 'ambassador' }),

                placeOrder: (input) => {
                    const s = get();
                    const listing = s.listings.find((l) => l.id === input.listingId)!;
                    const referredBy = s.session.referralCode ?? undefined;
                    const order: Order = {
                        id: uid('o'),
                        code: code(rng),
                        listingId: input.listingId,
                        fanId: s.session.fanId,
                        lines: input.lines,
                        guests: input.guests,
                        group: input.group,
                        subtotal: input.subtotal,
                        discount: input.discount,
                        total: input.total,
                        dueOnDay: input.dueOnDay,
                        promo: input.promo,
                        network: input.network,
                        phone: input.phone,
                        createdAt: now(),
                        visitAt: input.visitAt,
                        referredBy,
                        hireRequestId: input.hireRequestId,
                        split: splitOrder(input.total, listing.kind, s.settings, Boolean(referredBy)),
                    };
                    set((st) => ({ orders: [...st.orders, order], session: { ...st.session, referralCode: null } }));
                    if (input.hireRequestId) {
                        patchHire(input.hireRequestId, (r) => ({
                            ...r,
                            status: 'paid',
                            orderId: order.id,
                            timeline: [...r.timeline, { at: order.createdAt, label: 'Quote accepted and paid' }],
                        }));
                    }
                    return order;
                },
                addReview: (orderId, rating, text) =>
                    set((s) => {
                        const o = s.orders.find((x) => x.id === orderId)!;
                        return {
                            reviews: [...s.reviews, { id: uid('r'), listingId: o.listingId, orderId, fanId: o.fanId, rating, text, createdAt: now() }],
                        };
                    }),

                requestHire: (input) => {
                    const req: HireRequest = { ...input, id: uid('hr'), fanId: get().session.fanId, status: 'requested', timeline: [{ at: now(), label: 'Request sent' }] };
                    set((s) => ({ hireRequests: [...s.hireRequests, req] }));
                    return req;
                },
                sendQuote: (id, quote) => patchHire(id, (r) => ({ ...r, status: 'quoted', quote, timeline: [...r.timeline, { at: now(), label: 'Quote sent' }] })),
                declineHire: (id, reason) =>
                    patchHire(id, (r) => ({ ...r, status: 'declined', declineReason: reason, timeline: [...r.timeline, { at: now(), label: 'Declined' }] })),

                checkIn: (raw, listingId, day) => {
                    const ticket = raw.trim().toUpperCase().replace(/^TBK-/, '');
                    const order = get().orders.find((o) => o.code === ticket);
                    if (!order) return { status: 'unknown' };
                    if (order.listingId !== listingId) return { status: 'wrong-listing', order };
                    if (isoDay(new Date(order.visitAt)) !== day) return { status: 'not-today', order };
                    if (order.checkedInAt) return { status: 'already', order };
                    const updated = { ...order, checkedInAt: now() };
                    set((s) => ({ orders: s.orders.map((o) => (o.id === order.id ? updated : o)) }));
                    return { status: 'ok', order: updated };
                },

                submitListing: (listing) =>
                    set((s) => {
                        const exists = s.listings.some((l) => l.id === listing.id);
                        const next: Listing = { ...listing, status: 'pending', reviewNote: undefined };
                        return { listings: exists ? s.listings.map((l) => (l.id === listing.id ? next : l)) : [...s.listings, next] };
                    }),
                approveListing: (id) => patchListing(id, { status: 'live', reviewNote: undefined }),
                requestListingChanges: (id, note) => patchListing(id, { status: 'changes_requested', reviewNote: note }),
                rejectListing: (id, note) => patchListing(id, { status: 'rejected', reviewNote: note }),
                setFeatured: (id, featured) => patchListing(id, { featured }),
                setPaused: (id, paused) => patchListing(id, { status: paused ? 'paused' : 'live' }),
                reviewHost: (id, decision, note) =>
                    set((s) => ({
                        hosts: s.hosts.map((h) => (h.id === id ? { ...h, profileStatus: decision, verified: decision === 'approved', reviewNote: note } : h)),
                    })),
                updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
                withdraw: (input) => {
                    const payout: Payout = { ...input, id: uid('p'), at: now() };
                    set((s) => ({ payouts: [...s.payouts, payout] }));
                    return payout;
                },
            };
        },
        {
            name: 'timbuktu-demo',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: ({ seededAt, hosts, listings, fans, orders, reviews, saves, shares, hireRequests, payouts, settings, session }) => ({
                seededAt,
                hosts,
                listings,
                fans,
                orders,
                reviews,
                saves,
                shares,
                hireRequests,
                payouts,
                settings,
                session,
            }),
            // The sample world is anchored to the day it was made, so start a fresh one each day.
            merge: (persisted, current) => {
                const p = persisted as Partial<AppState> | undefined;
                if (!p?.seededAt || isoDay(p.seededAt) !== isoDay(Date.now()) || Date.now() - p.seededAt > DAY) return current;
                return { ...current, ...p };
            },
        },
    ),
);

export const useSession = () => useApp((s) => s.session);

export function useCurrentFan() {
    return useApp((s) => s.fans.find((f) => f.id === s.session.fanId)!);
}

export function useCurrentHost() {
    return useApp((s) => s.hosts.find((h) => h.id === s.session.hostId)!);
}
