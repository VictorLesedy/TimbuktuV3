import { DEFAULT_SETTINGS, splitOrder } from '@/lib/ledger';
import { DAY, HOUR, startOfDay } from '@/lib/format';
import { code, createRng, type Rng } from '@/lib/rng';
import type {
    Category,
    City,
    Fan,
    GuestGroup,
    HireRequest,
    Host,
    Interest,
    Listing,
    Network,
    Order,
    OrderLine,
    Payout,
    Review,
    Save,
    Settings,
    Share,
} from '@/types';
import { buildHosts, buildListings, STUDIO_HOST_ID } from './catalog';

export const DEMO_FAN_ID = 'f-demo';

export interface World {
    seededAt: number;
    hosts: Host[];
    listings: Listing[];
    fans: Fan[];
    orders: Order[];
    reviews: Review[];
    saves: Save[];
    shares: Share[];
    hireRequests: HireRequest[];
    payouts: Payout[];
    settings: Settings;
}

const FIRST = [
    'Amani', 'Neema', 'Baraka', 'Rehema', 'Juma', 'Zawadi', 'Faraji', 'Upendo', 'Hamisi', 'Mwanaisha', 'Khamis', 'Halima', 'Saidi', 'Asha',
    'Daudi', 'Esther', 'Godfrey', 'Happiness', 'Ibrahim', 'Joyce', 'Kassim', 'Lulu', 'Musa', 'Nasra', 'Omari', 'Pendo', 'Rashidi', 'Subira',
    'Tumaini', 'Winfrida', 'Yusuf', 'Zuhura', 'Elia', 'Grace', 'Abdul', 'Mariam', 'Frank', 'Salma', 'Peter', 'Aisha',
];
const LAST = [
    'Mushi', 'Mollel', 'Massawe', 'Kimaro', 'Mrisho', 'Mwakyusa', 'Shirima', 'Lyimo', 'Ngowi', 'Swai', 'Temba', 'Urio', 'Mbwambo', 'Kweka',
    'Salim', 'Hassan', 'Mohamed', 'Ally', 'Mnyampala', 'Komba', 'Haule', 'Ndunguru', 'Mapunda', 'Chande', 'Seif', 'Bakari',
];
const ARTISTS = ['Diamond Platnumz', 'Zuchu', 'Harmonize', 'Nandy', 'Rayvanny', 'Ali Kiba', 'Jux', 'Marioo', 'Mbosso', 'Lady Jaydee'];

/** Bookings over 90 days for each listing. Higher means busier. */
const WEIGHT: Record<string, number> = {
    'l-sunset-sessions': 110,
    'l-afrobeats-coco': 120,
    'l-derby-fanzone': 170,
    'l-bahari-fest': 80,
    'l-comedy': 75,
    'l-jazz-lawn': 22,
    'l-ngoma': 40,
    'l-kilele-rooftop': 170,
    'l-mlimani-lanes': 100,
    'l-pixel-arcade': 110,
    'l-bahari-cinema': 190,
    'l-pemba-gallery': 34,
    'l-usiku-club': 95,
    'l-bustani-park': 60,
    'l-ngorongoro': 34,
    'l-stone-town-walk': 85,
    'l-spice-farm': 46,
    'l-dhow': 80,
    'l-cooking': 38,
    'l-dance-class': 55,
};

/** Bookings made in the last 48 hours on top of the usual, so momentum has something to show. */
const SURGE: Record<string, number> = {
    'l-afrobeats-coco': 26,
    'l-derby-fanzone': 18,
    'l-jazz-lawn': 9,
    'l-sunset-sessions': 8,
    'l-dhow': 5,
    'l-usiku-club': 4,
};

/** Average review a listing tends to get. */
const QUALITY: Record<string, number> = {
    'l-sunset-sessions': 4.7,
    'l-stone-town-walk': 4.9,
    'l-ngorongoro': 4.8,
    'l-dhow': 4.8,
    'l-cooking': 4.9,
    'l-kilele-rooftop': 4.5,
    'l-bahari-cinema': 4.2,
    'l-derby-fanzone': 4.1,
    'l-usiku-club': 4.0,
};

const DAY_WEIGHTS: Partial<Record<Category, number[]>> = {
    Nightlife: [0.4, 0, 0.25, 0.45, 0.9, 1.5, 1.6],
    'Family day': [1.5, 0.15, 0.15, 0.2, 0.2, 0.4, 1.7],
    Arcade: [1.3, 0.4, 0.4, 0.5, 0.5, 0.9, 1.6],
    Cinema: [1.1, 0.5, 0.6, 0.6, 0.7, 1.4, 1.6],
    Gallery: [0.6, 0, 0.7, 0.8, 0.8, 0.9, 1.3],
};

const HOURS: Partial<Record<Category, [number, number]>> = {
    Nightlife: [19, 23],
    'Family day': [11, 17],
    Arcade: [13, 20],
    Cinema: [16, 21],
    Gallery: [11, 16],
};

const GROUP_BY_CATEGORY: Partial<Record<Category, number[]>> = {
    // Solo, Couples, Friends, Families
    Nightlife: [0.1, 0.3, 0.6, 0],
    'Family day': [0.05, 0.15, 0.2, 0.6],
    Arcade: [0.1, 0.15, 0.45, 0.3],
    Cinema: [0.15, 0.35, 0.3, 0.2],
    Concert: [0.15, 0.3, 0.5, 0.05],
    Festival: [0.1, 0.25, 0.45, 0.2],
    'Match day': [0.25, 0.1, 0.6, 0.05],
    Comedy: [0.1, 0.45, 0.45, 0],
    Tour: [0.15, 0.4, 0.25, 0.2],
    Class: [0.45, 0.3, 0.25, 0],
    Gallery: [0.4, 0.4, 0.2, 0],
};
const GROUPS: GuestGroup[] = ['Solo', 'Couples', 'Friends', 'Families'];

const REVIEW_TEXT: Record<number, string[]> = {
    5: [
        'Exactly what we hoped for. Got in quickly with the QR code and the staff were lovely.',
        'One of the best nights we have had this year. Will be back.',
        'Well organised from start to finish. Worth every shilling.',
        'Brilliant. Our guide knew everyone and every story.',
        'Great atmosphere, great music, and no queue at the gate.',
    ],
    4: [
        'Really good, a little crowded at the peak but the vibe made up for it.',
        'Good value and easy to book. Drinks took a while.',
        'Enjoyed it a lot. Parking was the only hassle.',
        'Lovely evening. Would go earlier next time to get a better spot.',
    ],
    3: ['Fine, but it started late and the sound was patchy.', 'Okay overall. Expected a bit more for the price.'],
    2: ['Too crowded and the queue for drinks was long.'],
};

const NETWORK_WEIGHTS = [0.5, 0.2, 0.2, 0.1];
const NETWORKS: Network[] = ['M-Pesa', 'Mixx by Yas', 'Airtel Money', 'HaloPesa'];

function phone(rng: Rng): string {
    const prefix = rng.pick(['754', '713', '765', '744', '768', '777', '716', '655', '688', '623']);
    return `+255 ${prefix} ${rng.int(100, 999)} ${rng.int(100, 999)}`;
}

function guestsFor(group: GuestGroup, rng: Rng): number {
    if (group === 'Solo') return 1;
    if (group === 'Couples') return 2;
    if (group === 'Families') return rng.int(3, 5);
    return rng.int(3, 6);
}

function atHour(day: Date, hour: number, minute = 0): Date {
    const d = new Date(day);
    d.setHours(hour, minute, 0, 0);
    return d;
}

/** Picks a visit date and time `daysBack` days before (negative: after) today that suits the listing. */
function visitFor(l: Listing, dayStart: Date, rng: Rng): Date | null {
    const weekday = dayStart.getDay();
    if (l.event) {
        const start = new Date(l.event.startsAt);
        if (weekday !== start.getDay()) return null;
        return atHour(dayStart, start.getHours(), start.getMinutes());
    }
    if (l.venue) {
        if (l.venue.closedOn.includes(weekday)) return null;
        const w = DAY_WEIGHTS[l.category]?.[weekday] ?? 1;
        if (!rng.chance(Math.min(1, w / 1.7))) return null;
        const [a, b] = HOURS[l.category] ?? [12, 20];
        return atHour(dayStart, rng.int(a, b), rng.pick([0, 15, 30, 45]));
    }
    if (l.service) {
        if (!l.service.days.includes(weekday)) return null;
        const [h, m] = rng.pick(l.service.times).split(':').map(Number);
        return atHour(dayStart, h!, m!);
    }
    return null;
}

function linesFor(l: Listing, guests: number, rng: Rng): { lines: OrderLine[]; subtotal: number; payNow: number } {
    if (l.event) {
        const tiers = l.event.tiers;
        const i = rng.weighted(tiers.map((_, idx) => (idx === tiers.length - 1 && tiers.length > 1 ? 0.12 : idx === 0 ? 0.4 : 0.6)));
        const tier = tiers[i]!;
        const qty = tier.name.toLowerCase().includes('for ') || tier.name === 'Family' ? 1 : guests;
        const subtotal = tier.price * qty;
        return { lines: [{ label: tier.name, qty, unitPrice: tier.price }], subtotal, payNow: subtotal };
    }
    if (l.venue) {
        const opts = l.venue.options;
        const i = rng.weighted(opts.map((_, idx) => [0.72, 0.22, 0.06][idx] ?? 0.05));
        const o = opts[i]!;
        const perPerson = o.price === o.deposit && !o.name.toLowerCase().includes('pack') && !o.name.toLowerCase().includes('group') && !o.name.toLowerCase().includes('party');
        const qty = perPerson ? guests : 1;
        return { lines: [{ label: o.name, qty, unitPrice: o.price }], subtotal: o.price * qty, payNow: o.deposit * qty };
    }
    const s = l.service;
    if (!s) {
        // Professionals are paid by quote; the caller fills in the line.
        const rate = l.professional?.rateFrom ?? 0;
        return { lines: [{ label: 'Hire', qty: 1, unitPrice: rate }], subtotal: rate, payNow: rate };
    }
    const qty = Math.min(guests, s.maxGroup);
    const subtotal = s.pricePerPerson * qty;
    return { lines: [{ label: 'Guests', qty, unitPrice: s.pricePerPerson }], subtotal, payNow: subtotal };
}

function reviewFor(rng: Rng, quality: number): { rating: number; text: string } {
    const r = Math.max(2, Math.min(5, Math.round(quality + (rng.next() - 0.55) * 1.6)));
    return { rating: r, text: rng.pick(REVIEW_TEXT[r]!) };
}

export function createWorld(now = Date.now()): World {
    const rng = createRng(20260903);
    const settings = structuredClone(DEFAULT_SETTINGS);
    const hosts = buildHosts(now);
    const listings = buildListings(now);
    const byId = new Map(listings.map((l) => [l.id, l]));
    const today = startOfDay(now);

    const fans: Fan[] = [];
    const interests: Interest[] = ['Music and nightlife', 'Sport and fitness', 'Days out', 'Arts and culture'];
    fans.push({
        id: DEMO_FAN_ID,
        name: 'Zawadi Mrisho',
        phone: '+255 754 318 662',
        city: 'Dar es Salaam',
        level: 'ambassador',
        interests: ['Music and nightlife', 'Days out'],
        artists: ['Zuchu', 'Jux'],
        referralCode: 'ZAWADI',
        joinedAt: new Date(now - 200 * DAY).toISOString(),
    });
    const cityWeights: [City, number][] = [
        ['Dar es Salaam', 0.55],
        ['Zanzibar', 0.18],
        ['Arusha', 0.17],
        ['Dodoma', 0.1],
    ];
    for (let i = 1; i < 200; i++) {
        const first = rng.pick(FIRST);
        const last = rng.pick(LAST);
        fans.push({
            id: `f-${i}`,
            name: `${first} ${last}`,
            phone: phone(rng),
            city: cityWeights[rng.weighted(cityWeights.map((c) => c[1]))]![0],
            level: i % 16 === 0 ? 'ambassador' : 'member',
            interests: interests.filter(() => rng.chance(0.45)),
            artists: ARTISTS.filter(() => rng.chance(0.2)),
            referralCode: `${first.toUpperCase()}${rng.int(10, 99)}`,
            joinedAt: new Date(now - rng.int(10, 400) * DAY).toISOString(),
        });
    }
    const fansByCity = new Map<City, Fan[]>();
    for (const f of fans.slice(1)) fansByCity.set(f.city, [...(fansByCity.get(f.city) ?? []), f]);
    const ambassadors = fans.filter((f) => f.level === 'ambassador');

    const orders: Order[] = [];
    const reviews: Review[] = [];
    let seq = 0;

    const makeOrder = (l: Listing, fan: Fan, visit: Date, created: Date, opts: { group?: GuestGroup; checkIn?: boolean; referredBy?: string } = {}) => {
        const groupWeights = GROUP_BY_CATEGORY[l.category] ?? [0.25, 0.25, 0.25, 0.25];
        const group = opts.group ?? GROUPS[rng.weighted(groupWeights)]!;
        const guests = guestsFor(group, rng);
        const { lines, subtotal, payNow } = linesFor(l, guests, rng);
        const promo = rng.chance(0.05) ? 'KARIBU10' : undefined;
        const discount = promo ? Math.round(payNow * 0.1) : 0;
        const total = payNow - discount;
        const referredBy = opts.referredBy ?? (rng.chance(0.09) ? rng.pick(ambassadors).referralCode : undefined);
        const order: Order = {
            id: `o-${++seq}`,
            code: code(rng),
            listingId: l.id,
            fanId: fan.id,
            lines,
            guests,
            group,
            subtotal,
            discount,
            total,
            dueOnDay: subtotal - payNow,
            promo,
            network: NETWORKS[rng.weighted(NETWORK_WEIGHTS)]!,
            phone: fan.phone,
            createdAt: created.toISOString(),
            visitAt: visit.toISOString(),
            referredBy,
            split: splitOrder(total, l.kind, settings, Boolean(referredBy)),
        };
        const past = visit.getTime() < now;
        if (past && (opts.checkIn ?? rng.chance(0.88))) {
            const arrived = Math.min(now - 60_000, visit.getTime() + rng.int(-20, 90) * 60_000);
            order.checkedInAt = new Date(arrived).toISOString();
        }
        orders.push(order);
        return order;
    };

    const pickFan = (l: Listing) => {
        const local = fansByCity.get(l.city) ?? [];
        return rng.chance(0.82) && local.length ? rng.pick(local) : rng.pick(fans.slice(1));
    };

    for (const l of listings) {
        const weight = WEIGHT[l.id];
        if (!weight || l.kind === 'professional') continue;
        const created = new Date(l.createdAt).getTime();
        // Candidate days: the last 84 days, plus the next 14 for advance bookings.
        const days: Date[] = [];
        for (let d = -84; d <= 14; d++) {
            const day = new Date(today.getTime() + d * DAY);
            if (day.getTime() < created) continue;
            days.push(day);
        }
        const slots = days.map((d) => visitFor(l, d, rng)).filter((v): v is Date => v !== null);
        if (!slots.length) continue;
        const perSlot = weight / Math.max(1, slots.filter((s) => s.getTime() < now).length || 1);
        for (const visit of slots) {
            const future = visit.getTime() > now;
            const daysAhead = (visit.getTime() - now) / DAY;
            // Advance bookings thin out further ahead.
            const expected = future ? perSlot * Math.max(0.15, 0.7 - daysAhead * 0.05) : perSlot;
            const count = Math.max(0, Math.round(expected * (0.6 + rng.next() * 0.8)));
            for (let i = 0; i < count; i++) {
                const leadDays = l.event ? rng.int(0, 12) : rng.weighted([0.4, 0.25, 0.15, 0.1, 0.1]);
                let createdAt = visit.getTime() - leadDays * DAY - rng.int(1, 10) * HOUR;
                // Bookings made before the surge window, so the surge stands out.
                createdAt = Math.min(createdAt, now - 50 * HOUR - rng.int(0, 200) * HOUR * (future ? 0.1 : 1));
                createdAt = Math.max(createdAt, created);
                makeOrder(l, pickFan(l), visit, new Date(createdAt));
            }
        }
        // Recent surge: advance bookings made in the last two days.
        const surge = SURGE[l.id] ?? 0;
        const upcoming = slots.filter((s) => s.getTime() > now);
        for (let i = 0; i < surge && upcoming.length; i++) {
            makeOrder(l, pickFan(l), upcoming[0]!, new Date(now - rng.int(10, 47 * 60) * 60_000));
        }
    }

    // Reviews come only from guests who were checked in.
    for (const o of orders) {
        if (!o.checkedInAt || o.fanId === DEMO_FAN_ID || !rng.chance(0.28)) continue;
        const l = byId.get(o.listingId)!;
        const { rating, text } = reviewFor(rng, QUALITY[l.id] ?? 4.4);
        reviews.push({
            id: `r-${reviews.length + 1}`,
            listingId: l.id,
            orderId: o.id,
            fanId: o.fanId,
            rating,
            text,
            createdAt: new Date(Math.min(now - 30 * 60_000, new Date(o.checkedInAt).getTime() + rng.int(12, 72) * HOUR)).toISOString(),
        });
    }

    // Saves and shares, weighted the same way, with a few more in the last two days for surging listings.
    const saves: Save[] = [];
    const shares: Share[] = [];
    for (const l of listings) {
        const w = WEIGHT[l.id] ?? 6;
        const n = Math.round(w * 0.35);
        for (let i = 0; i < n; i++) {
            saves.push({ listingId: l.id, fanId: pickFan(l).id, at: new Date(now - rng.int(50, 84 * 24) * HOUR).toISOString() });
            if (rng.chance(0.4)) shares.push({ listingId: l.id, fanId: pickFan(l).id, at: new Date(now - rng.int(1, 84 * 24) * HOUR).toISOString() });
        }
        for (let i = 0; i < (SURGE[l.id] ?? 0) / 2; i++) {
            saves.push({ listingId: l.id, fanId: pickFan(l).id, at: new Date(now - rng.int(1, 47) * HOUR).toISOString() });
        }
    }

    // Hiring: past paid bookings for professionals, plus requests still open.
    const hireRequests: HireRequest[] = [];
    const proBookings: Record<string, number> = {
        'l-dj-kibo': 14,
        'l-mawimbi': 9,
        'l-neema-lens': 8,
        'l-juma-sax': 6,
        'l-kilele-band': 6,
        'l-dj-malkia': 2,
    };
    const hire = (l: Listing, fan: Fan, date: Date, status: HireRequest['status'], price: number, requestedAt: number): HireRequest => {
        const req: HireRequest = {
            id: `hr-${hireRequests.length + 1}`,
            listingId: l.id,
            fanId: fan.id,
            date: date.toISOString(),
            location: rng.pick(['Mbezi Beach', 'Mikocheni', 'Masaki', 'Kigamboni', 'Mbweni', 'Oyster Bay', 'Njiro', 'Paje']),
            hours: rng.pick([3, 4, 5]),
            budget: Math.round((price * (0.8 + rng.next() * 0.4)) / 50000) * 50000,
            message: rng.pick([
                'Wedding reception for about 150 guests. We want a mix of Bongo Flava and old dansi.',
                'Birthday party at home, around 60 people. Garden set-up.',
                'Company end-of-year party, 120 staff. Need a mic for speeches.',
                'Send-off party in a hall. Starts at 18:00.',
                'Engagement dinner, 40 guests, mostly family.',
            ]),
            status,
            timeline: [{ at: new Date(requestedAt).toISOString(), label: 'Request sent' }],
        };
        if (status !== 'requested') {
            const quotedAt = requestedAt + rng.int(1, 8) * HOUR;
            req.quote = {
                price,
                terms: 'Includes sound system and travel within the city. 50% is non-refundable within 7 days of the date.',
                expiresAt: new Date(quotedAt + 5 * DAY).toISOString(),
            };
            req.timeline.push({ at: new Date(quotedAt).toISOString(), label: `Quote sent` });
        }
        hireRequests.push(req);
        return req;
    };
    for (const [id, n] of Object.entries(proBookings)) {
        const l = byId.get(id)!;
        for (let i = 0; i < n; i++) {
            const dayOffset = rng.int(-80, 20);
            const date = atHour(new Date(today.getTime() + dayOffset * DAY), rng.pick([14, 16, 18, 19]));
            if (date.getTime() < new Date(l.createdAt).getTime()) continue;
            const price = Math.round((l.professional!.rateFrom * (1 + rng.next() * 0.8)) / 50000) * 50000;
            const requestedAt = date.getTime() - rng.int(10, 30) * DAY;
            const fan = pickFan(l);
            const req = hire(l, fan, date, 'paid', price, requestedAt);
            const paidAt = requestedAt + rng.int(10, 40) * HOUR;
            const order = makeOrder(l, fan, date, new Date(Math.min(paidAt, now - HOUR)), { group: 'Friends' });
            order.lines = [{ label: `Hire for ${req.hours} hours`, qty: 1, unitPrice: price }];
            order.guests = 1;
            order.subtotal = price;
            order.discount = 0;
            order.total = price;
            order.dueOnDay = 0;
            order.promo = undefined;
            order.hireRequestId = req.id;
            order.split = splitOrder(price, 'professional', settings, Boolean(order.referredBy));
            req.orderId = order.id;
            req.timeline.push({ at: order.createdAt, label: 'Quote accepted and paid' });
        }
    }

    // The studio's open requests, so there is something to answer.
    const band = byId.get('l-kilele-band')!;
    hire(band, fans[12]!, atHour(new Date(today.getTime() + 19 * DAY), 18), 'requested', band.professional!.rateFrom, now - 5 * HOUR);
    hire(band, fans[40]!, atHour(new Date(today.getTime() + 33 * DAY), 16), 'requested', band.professional!.rateFrom, now - 26 * HOUR);
    hire(band, fans[77]!, atHour(new Date(today.getTime() + 12 * DAY), 19), 'quoted', 1500000, now - 3 * DAY);

    // The demo fan's own history.
    const demo = fans[0]!;
    const find = (id: string) => byId.get(id)!;
    const kilele = find('l-kilele-rooftop');
    let tonight = today;
    for (let i = 0; i < 7 && kilele.venue!.closedOn.includes(tonight.getDay()); i++) tonight = new Date(tonight.getTime() + DAY);
    makeOrder(kilele, demo, atHour(tonight, 21), new Date(now - 20 * HOUR), { group: 'Couples' });
    const sunset = find('l-sunset-sessions');
    makeOrder(sunset, demo, new Date(sunset.event!.startsAt), new Date(now - 3 * DAY), { group: 'Friends' });
    const arcadeVisit = atHour(new Date(today.getTime() - 8 * DAY), 16);
    makeOrder(find('l-pixel-arcade'), demo, arcadeVisit, new Date(arcadeVisit.getTime() - DAY), { group: 'Friends', checkIn: true });
    const walkVisit = atHour(new Date(today.getTime() - 30 * DAY), 9);
    const walk = makeOrder(find('l-stone-town-walk'), demo, walkVisit, new Date(walkVisit.getTime() - 3 * DAY), { group: 'Couples', checkIn: true });
    reviews.push({
        id: `r-${reviews.length + 1}`,
        listingId: walk.listingId,
        orderId: walk.id,
        fanId: demo.id,
        rating: 5,
        text: 'Our guide grew up two streets away and knew everyone. Best way to see Stone Town.',
        createdAt: new Date(walkVisit.getTime() + DAY).toISOString(),
    });
    const derbyVisit = atHour(new Date(today.getTime() - 14 * DAY), 16);
    makeOrder(find('l-derby-fanzone'), demo, derbyVisit, new Date(derbyVisit.getTime() - 2 * DAY), { group: 'Friends', checkIn: true });
    const kibo = find('l-dj-kibo');
    hire(kibo, demo, atHour(new Date(today.getTime() + 24 * DAY), 18), 'quoted', 550000, now - 2 * DAY);
    for (const id of ['l-dhow', 'l-ngorongoro', 'l-afrobeats-coco', 'l-mawimbi']) saves.push({ listingId: id, fanId: demo.id, at: new Date(now - rng.int(2, 20) * DAY).toISOString() });

    // Sales brought in by the demo fan's ambassador link.
    for (let i = 0; i < 26; i++) {
        const l = rng.pick(listings.filter((x) => WEIGHT[x.id] && x.city === 'Dar es Salaam'));
        const visit = atHour(new Date(today.getTime() - rng.int(1, 60) * DAY), 20);
        makeOrder(l, rng.pick(fansByCity.get('Dar es Salaam')!), visit, new Date(visit.getTime() - rng.int(1, 4) * DAY), { referredBy: demo.referralCode });
    }

    orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    // Payouts already made: hosts every two weeks, up to what they had earned by then.
    const payouts: Payout[] = [];
    for (const h of hosts) {
        const own = new Set(listings.filter((l) => l.hostId === h.id).map((l) => l.id));
        let paid = 0;
        for (let d = 84; d >= 14; d -= 14) {
            const cutoff = now - d * DAY;
            const earned = orders.filter((o) => own.has(o.listingId) && new Date(o.createdAt).getTime() < cutoff).reduce((s, o) => s + o.split.entertainer, 0);
            const amount = Math.floor((earned - paid) / 1000) * 1000;
            if (amount < 50000) continue;
            payouts.push({ id: `p-${payouts.length + 1}`, party: 'host', ownerId: h.id, amount, network: 'M-Pesa', phone: h.phone, at: new Date(cutoff + 10 * HOUR).toISOString() });
            paid += amount;
        }
    }
    const demoEarned = orders.filter((o) => o.referredBy === demo.referralCode && new Date(o.createdAt).getTime() < now - 21 * DAY).reduce((s, o) => s + o.split.ambassador, 0);
    if (demoEarned > 0) {
        payouts.push({ id: `p-${payouts.length + 1}`, party: 'ambassador', ownerId: demo.id, amount: Math.floor(demoEarned / 1000) * 1000, network: 'M-Pesa', phone: demo.phone, at: new Date(now - 20 * DAY).toISOString() });
    }

    return { seededAt: now, hosts, listings, fans, orders, reviews, saves, shares, hireRequests, payouts, settings };
}

export { STUDIO_HOST_ID };
