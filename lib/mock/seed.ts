import { CITY_CENTER, DEFAULT_SETTINGS, DEMO_IDS } from "../config";
import { splitOrder } from "../ledger";
import { makeRng, type Rng } from "../rng";
import type {
  Activation,
  HireRequest,
  Interaction,
  InteractionKind,
  LedgerEntry,
  Media,
  Order,
  OrderKind,
  Payout,
  Provider,
  Review,
  Save,
  Settings,
  Slot,
  User,
} from "../schemas";
import {
  ACTIVATIONS,
  type ActivationDef,
  ARTISTS,
  FIRST_NAMES,
  LAST_NAMES,
  PHOTO_IDS,
  PROVIDERS,
  type Profile,
  REVIEW_TEXT,
  THEME_HUE,
  type Theme,
} from "./catalog";

export type World = {
  users: User[];
  providers: Provider[];
  activations: Activation[];
  interactions: Interaction[];
  reviews: Review[];
  orders: Order[];
  ledger: LedgerEntry[];
  saves: Save[];
  hireRequests: HireRequest[];
  payouts: Payout[];
  settings: Settings;
};

const SEED = 20_260_915;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const INTERACTION_TARGET = 8000;
const USER_COUNT = 200;

const iso = (ms: number) => new Date(ms).toISOString();

function photoUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
}

function makeMedia(theme: Theme, title: string, rng: Rng): Media[] {
  const ids = PHOTO_IDS[theme];
  const start = rng.int(0, ids.length - 1);
  return [0, 1, 2].map((i) => ({
    url: photoUrl(ids[(start + i) % ids.length] ?? ids[0] ?? ""),
    alt: `${title}, photo ${i + 1}`,
    hue: THEME_HUE[theme] + rng.int(-12, 12),
  }));
}

function hourForBand(band: number, rng: Rng) {
  switch (band) {
    case 0:
      return rng.int(10, 16);
    case 1:
      return rng.int(17, 20);
    case 2:
      return rng.int(21, 23);
    default:
      return rng.int(0, 4);
  }
}

/** Next date (from `from`) that falls on Monday-first `day`, at `hour`. */
function nextOn(from: Date, day: number, hour: number, weeksAhead = 0) {
  const d = new Date(from);
  const current = (d.getDay() + 6) % 7;
  let delta = (day - current + 7) % 7;
  if (delta === 0 && d.getHours() >= hour) delta = 7;
  d.setDate(d.getDate() + delta + weeksAhead * 7);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function peakDay(profile: Profile) {
  return profile.days.indexOf(Math.max(...profile.days));
}
function peakBand(profile: Profile) {
  return profile.bands.indexOf(Math.max(...profile.bands));
}

/** A timestamp in the past that follows the activation's weekly rhythm. */
function rhythmicPast(profile: Profile, now: number, minMs: number, rng: Rng) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const day = rng.weighted(profile.days.map((w, i) => [i, w] as const));
    const band = rng.weighted(profile.bands.map((w, i) => [i, w] as const));
    const d = new Date(now - rng.int(0, 12) * 7 * DAY);
    d.setHours(12, 0, 0, 0);
    const calendarDay = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - ((calendarDay - day + 7) % 7));
    // After-midnight check-ins belong to the night that started the day before.
    if (band === 3) d.setDate(d.getDate() + 1);
    d.setHours(hourForBand(band, rng), rng.int(0, 59), 0, 0);
    let t = d.getTime();
    if (t > now) t -= 7 * DAY;
    if (t >= minMs) return t;
  }
  return Math.max(minMs, now - rng.int(1, 5) * DAY);
}

const KIND_WEIGHTS: Record<Activation["type"], readonly (readonly [InteractionKind, number])[]> = {
  event: [
    ["view", 35],
    ["save", 12],
    ["share", 7],
    ["purchase", 22],
    ["checkin", 18],
    ["review", 4],
  ],
  venue: [
    ["view", 35],
    ["save", 11],
    ["share", 6],
    ["booking", 15],
    ["checkin", 27],
    ["review", 6],
  ],
  service: [
    ["view", 35],
    ["save", 12],
    ["share", 6],
    ["booking", 24],
    ["checkin", 17],
    ["review", 6],
  ],
  professional: [
    ["view", 42],
    ["save", 18],
    ["share", 9],
    ["booking", 13],
    ["checkin", 10],
    ["review", 8],
  ],
};

type VenueOption = { id: string; name: string; minSpend: number; deposit: number; seats: number; kind: "entry" | "table" | "vip" };

/** Booking options that make sense for each kind of place. */
function venueOptions(subtype: string, theme: string, price: number): VenueOption[] {
  const k = (n: number) => Math.round(n / 1000) * 1000;
  const names: Record<string, [string, string, number, string, number]> = {
    cinema: ["Standard seat", "Family pack", 4, "Private screening room", 16],
    arcade: ["Day pass", "Bowling lane", 6, "Party room", 15],
    arts_centre: ["Entry", "Guided group tour", 8, "Private viewing", 15],
    sports_bar: ["Entry", "Table near the screen", 6, "Terrace box", 12],
  };
  const beach = theme === "coast";
  const [entry, mid, midSeats, top, topSeats] =
    names[subtype] ?? (beach ? ["Day pass", "Cabana", 6, "Beach villa", 10] : ["Entry", "Lounge table", 6, "VIP booth", 10]);
  // Leisure venues sell fixed packages; nightlife venues take a deposit against a minimum spend.
  const packaged = subtype in names || beach;
  return [
    { id: "entry", name: entry, minSpend: 0, deposit: k(price / 12), seats: 1, kind: "entry" },
    { id: "table", name: mid, minSpend: packaged ? 0 : price, deposit: k(price / (packaged ? 3 : 5)), seats: midSeats, kind: "table" },
    {
      id: "vip",
      name: top,
      minSpend: packaged ? 0 : price * 3,
      deposit: k((price * 3) / (packaged ? 2 : 5)),
      seats: topSeats,
      kind: "vip",
    },
  ];
}

export function generateWorld(nowMs: number = Date.now()): World {
  const rng = makeRng(SEED);
  const now = new Date(nowMs);
  const settings: Settings = structuredClone(DEFAULT_SETTINGS);

  /* ---------- Users ---------- */
  const users: User[] = [
    {
      id: DEMO_IDS.fan,
      name: "Asha Mrema",
      phone: "+255 712 345 678",
      city: "Dar es Salaam",
      roles: ["fan"],
      fanLevel: "member",
      membership: "gold",
      favouriteArtists: ["Malkia Wave", "DJ Kivuli", "Zawadi Soul"],
      experiencePref: "music_nightlife",
      followers: 146,
      referralCode: "ASHA-DSM",
      joinedAt: iso(nowMs - 64 * DAY),
      ambassadorSince: null,
    },
    {
      id: DEMO_IDS.entertainer,
      name: "Juma Kweka",
      phone: "+255 754 111 222",
      city: "Dar es Salaam",
      roles: ["fan", "entertainer"],
      fanLevel: "member",
      membership: "platinum",
      favouriteArtists: [],
      experiencePref: "days_out",
      followers: 1210,
      referralCode: "JUMA-DSM",
      joinedAt: iso(nowMs - 400 * DAY),
      ambassadorSince: null,
    },
    {
      id: DEMO_IDS.admin,
      name: "Timbuktu operations",
      phone: "+255 684 000 000",
      city: "Dar es Salaam",
      roles: ["admin"],
      fanLevel: "member",
      membership: "standard",
      favouriteArtists: [],
      experiencePref: null,
      followers: 0,
      referralCode: "OPS",
      joinedAt: iso(nowMs - 500 * DAY),
      ambassadorSince: null,
    },
  ];
  const cities = ["Dar es Salaam", "Dar es Salaam", "Dar es Salaam", "Zanzibar", "Arusha", "Dodoma"] as const;
  for (let i = users.length; i < USER_COUNT; i++) {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const ambassador = rng.chance(0.05);
    users.push({
      id: `u_${i}`,
      name: `${first} ${last}`,
      phone: `+255 7${rng.int(10, 79)} ${rng.int(100, 999)} ${rng.int(100, 999)}`,
      city: rng.pick(cities),
      roles: ["fan"],
      fanLevel: ambassador ? "ambassador" : rng.chance(0.85) ? "member" : "explorer",
      membership: rng.weighted([
        ["standard", 70],
        ["gold", 22],
        ["platinum", 8],
      ] as const),
      favouriteArtists: [rng.pick(ARTISTS), rng.pick(ARTISTS), rng.pick(ARTISTS)],
      experiencePref: rng.pick(["music_nightlife", "sport", "days_out", "arts_culture"] as const),
      followers: ambassador ? rng.int(300, 4000) : rng.int(0, 120),
      referralCode: `${first.toUpperCase()}-${i}`,
      joinedAt: iso(nowMs - rng.int(10, 700) * DAY),
      ambassadorSince: ambassador ? iso(nowMs - rng.int(30, 200) * DAY) : null,
    });
  }
  const fanPool = users.filter((u) => u.id.startsWith("u_") && /\d/.test(u.id));
  const ambassadors = users.filter((u) => u.fanLevel === "ambassador");

  /* ---------- Providers ---------- */
  const providers: Provider[] = PROVIDERS.map((def, i) => {
    let userId: string = DEMO_IDS.entertainer;
    if (def.owner !== "entertainer") {
      const owner = users[10 + i];
      if (!owner) throw new Error("Not enough users for providers");
      owner.roles = ["fan", "entertainer"];
      userId = owner.id;
    }
    return {
      id: `p_${def.key}`,
      userId,
      name: def.name,
      category: def.category,
      subtype: def.subtype,
      verified: !def.pending,
      reviewState: def.pending ? "pending" : "approved",
      city: def.city,
      createdAt: iso(nowMs - (def.pending ? rng.int(0, 2) : rng.int(120, 700)) * DAY),
      payoutPhone: `+255 7${rng.int(10, 79)} ${rng.int(100, 999)} ${rng.int(100, 999)}`,
    };
  });
  const providerById = new Map(providers.map((p) => [p.id, p]));

  /* ---------- Activations ---------- */
  const defByKey = new Map<string, ActivationDef>();
  const activations: Activation[] = ACTIVATIONS.map((def) => {
    defByKey.set(def.key, def);
    const provider = providerById.get(`p_${def.provider}`);
    if (!provider) throw new Error(`Unknown provider ${def.provider}`);
    const center = CITY_CENTER[provider.city];
    const createdAt = iso(nowMs - (def.ageDays ?? rng.int(95, 400)) * DAY - rng.int(1, 20) * HOUR);
    const base: Activation = {
      id: `a_${def.key}`,
      slug: def.key,
      providerId: provider.id,
      type: def.type,
      title: def.title,
      description: def.description,
      media: makeMedia(def.theme, def.title, rng),
      city: provider.city,
      location: { area: def.area, lat: center.lat + rng.float(-0.06, 0.06), lng: center.lng + rng.float(-0.06, 0.06) },
      status: def.status ?? "live",
      featured: def.popularity >= 1.2,
      createdAt,
    };

    if (def.type === "event") {
      const day = peakDay(def.profile);
      const band = peakBand(def.profile);
      const hour = band === 0 ? (def.theme === "run" ? 6 : 12) : band === 1 ? 18 : 21;
      const start = nextOn(now, day, hour, rng.int(0, 3));
      const p = def.price;
      base.event = {
        startsAt: start.toISOString(),
        endsAt: iso(start.getTime() + (def.theme === "run" ? 4 : 6) * HOUR),
        lineup: def.lineup ?? [],
        tiers: [
          { id: "early", name: "Early Bird", price: p, capacity: rng.int(80, 150), sold: 0, perks: "General entry. Limited release." },
          {
            id: "vip",
            name: "VIP",
            price: Math.round((p * 2.4) / 1000) * 1000,
            capacity: rng.int(40, 80),
            sold: 0,
            perks: "Fast-lane entry and a VIP bar.",
          },
          {
            id: "vvip",
            name: "VVIP",
            price: Math.round((p * 6) / 1000) * 1000,
            capacity: rng.int(10, 24),
            sold: 0,
            perks: "Reserved seating, host service and a welcome bottle.",
          },
        ],
      };
    } else if (def.type === "venue") {
      const openDays = def.profile.days.map((w, i) => (w >= 0.3 ? i : -1)).filter((i) => i >= 0);
      const lateNight = def.profile.bands[3] > 0.4;
      const subtype = PROVIDERS.find((x) => x.key === def.provider)?.subtype ?? "club";
      base.venue = {
        hours: def.hours ?? (def.profile.bands[0] > 0.5 ? "10:00 until 22:00" : lateNight ? "20:00 until 04:00" : "17:00 until 01:00"),
        openDays,
        tableOptions: venueOptions(subtype, def.theme, def.price),
      };
    } else if (def.type === "service") {
      const slots: Slot[] = [];
      for (let d = 0; d < 16; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        const dow = (date.getDay() + 6) % 7;
        if ((def.profile.days[dow] ?? 0) < 0.3) continue;
        const band = peakBand(def.profile);
        const baseHour = band === 0 ? (def.theme === "run" ? 6 : 9) : band === 1 ? 17 : 19;
        const count = rng.int(1, 2);
        for (let s = 0; s < count; s++) {
          const start = new Date(date);
          start.setHours(baseHour + s * 3, s === 0 ? 0 : 30, 0, 0);
          if (start.getTime() < nowMs + HOUR) continue;
          const capacity = rng.int(10, 20);
          const booked = rng.chance(0.18) ? capacity : rng.int(0, capacity - 2);
          slots.push({ id: `s_${def.key}_${d}_${s}`, startsAt: start.toISOString(), capacity, booked });
        }
      }
      base.service = { durationMins: def.durationMins ?? 120, pricePerPerson: def.price, slots };
    } else {
      const availability: string[] = [];
      for (let d = 2; d < 50; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        const dow = (date.getDay() + 6) % 7;
        if (rng.chance(dow >= 4 ? 0.55 : 0.7)) {
          const y = date.getFullYear();
          availability.push(`${y}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
        }
      }
      base.professional = { baseRate: def.price, availability };
    }
    return base;
  });
  const activationById = new Map(activations.map((a) => [a.id, a]));

  /* ---------- Interactions, orders, ledger, reviews ---------- */
  const interactions: Interaction[] = [];
  const orders: Order[] = [];
  const ledger: LedgerEntry[] = [];
  const reviews: Review[] = [];
  const makeId = (p: string) => rng.id(p);
  const quality = new Map(activations.map((a) => [a.id, rng.float(3.7, 4.85)]));

  const active = activations.filter((a) => a.status === "live" || a.status === "paused");
  const weightedActive = active.map((a) => [a, defByKey.get(a.slug)?.popularity ?? 0.5] as const);

  function pickTier(
    a: Activation,
  ): { label: string; unit: number; qty: number; tier: Interaction["tier"]; tierId?: string; tableId?: string } | null {
    if (a.event) {
      const tier = rng.weighted(a.event.tiers.map((t, i) => [t, [55, 33, 12][i] ?? 10] as const));
      const qty = rng.weighted([
        [1, 5],
        [2, 4],
        [3, 1],
      ] as const);
      if (tier.sold + qty > tier.capacity) return null;
      tier.sold += qty;
      return { label: `${tier.name} ticket`, unit: tier.price, qty, tier: tier.id === "early" ? "general" : "vip", tierId: tier.id };
    }
    if (a.venue) {
      const option = rng.weighted(a.venue.tableOptions.map((o, i) => [o, [52, 34, 14][i] ?? 10] as const));
      return {
        label: `${option.name} deposit`,
        unit: option.deposit,
        qty: 1,
        tier: option.kind === "entry" ? "general" : option.kind === "table" ? "table" : "vip",
        tableId: option.id,
      };
    }
    if (a.service) {
      const qty = rng.int(1, 4);
      return { label: "Slot booking", unit: a.service.pricePerPerson, qty, tier: "general" };
    }
    if (a.professional) {
      return {
        label: "Hire fee",
        unit: Math.round((a.professional.baseRate * rng.float(1, 1.8)) / 10_000) * 10_000,
        qty: 1,
        tier: "general",
      };
    }
    return null;
  }

  function addPaidOrder(
    a: Activation,
    userId: string,
    at: number,
    opts: { referrerId?: string; checkedIn?: number; scheduledFor?: number; fixed?: ReturnType<typeof pickTier> },
  ) {
    const choice = opts.fixed ?? pickTier(a);
    if (!choice) return null;
    const total = choice.unit * choice.qty;
    const kind: OrderKind = a.type === "event" ? "ticket" : a.type === "venue" ? "reservation" : a.type === "service" ? "slot" : "hire";
    const order: Order = {
      id: makeId("ord"),
      code: `TBK-${rng.int(100000, 999999)}`,
      userId,
      activationId: a.id,
      kind,
      lines: [{ label: choice.label, unitPrice: choice.unit, qty: choice.qty, tierId: choice.tierId, tableId: choice.tableId }],
      discount: 0,
      total,
      status: "paid",
      createdAt: iso(at),
      scheduledFor: opts.scheduledFor
        ? iso(opts.scheduledFor)
        : a.event && at > nowMs - 7 * DAY
          ? a.event.startsAt
          : iso(at + rng.int(1, 6) * DAY),
      checkedInAt: opts.checkedIn ? iso(opts.checkedIn) : undefined,
      referrerId: opts.referrerId,
      phone: "+255 7xx xxx xxx",
      network: rng.pick(["M-Pesa", "Mixx by Yas", "Airtel Money", "HaloPesa"] as const),
    };
    orders.push(order);
    ledger.push(...splitOrder(order, a, settings, makeId));
    return { order, choice };
  }

  let guard = 0;
  while (interactions.length < INTERACTION_TARGET && guard++ < INTERACTION_TARGET * 3) {
    const a = rng.weighted(weightedActive);
    const def = defByKey.get(a.slug);
    if (!def) continue;
    const created = new Date(a.createdAt).getTime();
    const kind = rng.weighted(KIND_WEIGHTS[a.type]);
    const user = rng.pick(fanPool);
    let at: number;
    if (kind === "checkin" || kind === "review") {
      at = rhythmicPast(def.profile, nowMs - 3 * HOUR, created, rng);
      if (kind === "review") at += rng.int(2, 30) * HOUR;
      if (at > nowMs) at = nowMs - rng.int(3, 40) * HOUR;
    } else {
      // Older interactions thin out; recent weeks are a little busier.
      const ageDays = 90 * rng.next() ** 1.25;
      at = Math.max(created + HOUR, nowMs - ageDays * DAY - rng.int(0, 23) * HOUR);
      if (at > nowMs - 49 * HOUR && rng.chance(0.6)) at -= 3 * DAY; // keep the 48h window for bursts
    }

    if (kind === "purchase" || kind === "booking") {
      const referrer = rng.chance(0.07) ? rng.pick(ambassadors) : undefined;
      const res = addPaidOrder(a, user.id, at, { referrerId: referrer?.id });
      if (!res) continue;
      interactions.push({
        id: makeId("int"),
        activationId: a.id,
        userId: user.id,
        kind,
        amount: res.order.total,
        tier: res.choice.tier,
        at: iso(at),
      });
      if (referrer) {
        interactions.push({
          id: makeId("int"),
          activationId: a.id,
          userId: referrer.id,
          kind: "referral_sale",
          amount: res.order.total,
          at: iso(at),
        });
      }
      continue;
    }
    if (kind === "review") {
      const q = quality.get(a.id) ?? 4.2;
      const rating = Math.max(1, Math.min(5, Math.round(q + rng.float(-1.2, 0.9))));
      const pool = rating >= 4 ? REVIEW_TEXT.high : rating === 3 ? REVIEW_TEXT.mid : REVIEW_TEXT.low;
      reviews.push({ id: makeId("rev"), userId: user.id, activationId: a.id, rating, text: rng.pick(pool), verified: true, at: iso(at) });
    }
    interactions.push({ id: makeId("int"), activationId: a.id, userId: user.id, kind, at: iso(at) });
  }

  // Momentum bursts in the last 48 hours, stronger for "hot" activations.
  for (const a of active) {
    const def = defByKey.get(a.slug);
    const burst = def?.hot ?? rng.int(0, 6);
    for (let i = 0; i < burst; i++) {
      const at = nowMs - rng.next() ** 1.4 * 47 * HOUR;
      const kind = rng.weighted([
        ["view", 30],
        ["save", 30],
        ["share", 18],
        ["purchase", 22],
      ] as const);
      const user = rng.pick(fanPool);
      if (kind === "purchase") {
        const k: InteractionKind = a.type === "event" ? "purchase" : "booking";
        const res = addPaidOrder(a, user.id, at, {});
        if (!res) continue;
        interactions.push({
          id: makeId("int"),
          activationId: a.id,
          userId: user.id,
          kind: k,
          amount: res.order.total,
          tier: res.choice.tier,
          at: iso(at),
        });
      } else {
        interactions.push({ id: makeId("int"), activationId: a.id, userId: user.id, kind, at: iso(at) });
      }
    }
  }

  /* ---------- Demo fan story ---------- */
  const me = DEMO_IDS.fan;
  const get = (key: string) => {
    const a = activationById.get(`a_${key}`);
    if (!a) throw new Error(`Missing activation ${key}`);
    return a;
  };

  // A Monday soul supper last week: checked in, not yet reviewed.
  const supper = get("monday-soul-supper");
  const lastMonday = nextOn(new Date(nowMs - 7 * DAY), 0, 19).getTime();
  const supperAt = lastMonday > nowMs ? lastMonday - 7 * DAY : lastMonday;
  const earlyTier = supper.event?.tiers[0];
  if (earlyTier) {
    addPaidOrder(supper, me, supperAt - 4 * DAY, {
      scheduledFor: supperAt,
      checkedIn: supperAt + 40 * 60_000,
      fixed: { label: "Early Bird ticket", unit: earlyTier.price, qty: 1, tier: "general", tierId: "early" },
    });
    interactions.push({ id: makeId("int"), activationId: supper.id, userId: me, kind: "checkin", at: iso(supperAt + 40 * 60_000) });
  }

  // A Kilele table two weekends ago: checked in and reviewed.
  const kilele = get("kilele-rooftop");
  const kileleAt = nowMs - 10 * DAY;
  const tableOpt = kilele.venue?.tableOptions[1];
  if (tableOpt) {
    const res = addPaidOrder(kilele, me, kileleAt - 2 * DAY, {
      scheduledFor: kileleAt,
      checkedIn: kileleAt + HOUR,
      fixed: { label: `${tableOpt.name} deposit`, unit: tableOpt.deposit, qty: 1, tier: "table", tableId: tableOpt.id },
    });
    interactions.push({ id: makeId("int"), activationId: kilele.id, userId: me, kind: "checkin", at: iso(kileleAt + HOUR) });
    reviews.push({
      id: makeId("rev"),
      userId: me,
      activationId: kilele.id,
      orderId: res?.order.id,
      rating: 5,
      text: "Our table had the best view of the harbour, and the host checked on us all night.",
      verified: true,
      at: iso(kileleAt + 20 * HOUR),
    });
  }

  // Upcoming VIP tickets for Sunset Sessions: ready for door check-in in the studio.
  const sunset = get("sunset-sessions-rooftop");
  const vip = sunset.event?.tiers[1];
  if (sunset.event) {
    // The demo story needs this event within the next week, whatever the random schedule chose.
    const oldStart = sunset.event.startsAt;
    const start = nextOn(now, 4, 21, 0);
    sunset.event.startsAt = start.toISOString();
    sunset.event.endsAt = iso(start.getTime() + 6 * HOUR);
    for (const o of orders) if (o.activationId === sunset.id && o.scheduledFor === oldStart) o.scheduledFor = sunset.event.startsAt;
  }
  if (vip && sunset.event) {
    vip.capacity = Math.max(vip.capacity, vip.sold + 6);
    vip.sold += 2;
    addPaidOrder(sunset, me, nowMs - 2 * DAY, {
      scheduledFor: new Date(sunset.event.startsAt).getTime(),
      fixed: { label: "VIP ticket", unit: vip.price, qty: 2, tier: "vip", tierId: "vip" },
    });
  }

  // An upcoming long-run slot.
  const run = get("mbio-saturday-long-run");
  const runSlot = run.service?.slots.find((s) => s.booked < s.capacity);
  if (run.service && runSlot) {
    runSlot.booked += 1;
    const res = addPaidOrder(run, me, nowMs - DAY, {
      scheduledFor: new Date(runSlot.startsAt).getTime(),
      fixed: { label: "Slot booking", unit: run.service.pricePerPerson, qty: 1, tier: "general" },
    });
    if (res?.order.lines[0]) res.order.lines[0].slotId = runSlot.id;
  }

  // Shares and saves.
  for (const [key, h] of [
    ["amapiano-on-the-dhow", 30],
    ["dj-kivuli", 70],
  ] as const) {
    interactions.push({ id: makeId("int"), activationId: get(key).id, userId: me, kind: "share", at: iso(nowMs - h * HOUR) });
  }
  const saves: Save[] = [];
  for (const [key, h] of [
    ["amapiano-on-the-dhow", 40],
    ["sunset-dhow-cruise", 90],
    ["dhow-house", 12],
  ] as const) {
    saves.push({ userId: me, activationId: get(key).id, at: iso(nowMs - h * HOUR) });
    interactions.push({ id: makeId("int"), activationId: get(key).id, userId: me, kind: "save", at: iso(nowMs - h * HOUR) });
  }

  // Sales driven by Asha's link before she unlocks ambassador: earnings wait for her.
  const referable = active.filter((a) => a.type === "event" || a.type === "venue");
  for (let i = 0; i < 12; i++) {
    const a = rng.pick(referable);
    const at = nowMs - rng.int(1, 30) * DAY - rng.int(0, 20) * HOUR;
    const buyer = rng.pick(fanPool);
    const res = addPaidOrder(a, buyer.id, at, { referrerId: me });
    if (!res) continue;
    interactions.push({
      id: makeId("int"),
      activationId: a.id,
      userId: buyer.id,
      kind: a.type === "event" ? "purchase" : "booking",
      amount: res.order.total,
      tier: res.choice.tier,
      at: iso(at),
    });
    interactions.push({ id: makeId("int"), activationId: a.id, userId: me, kind: "referral_sale", amount: res.order.total, at: iso(at) });
  }

  /* ---------- Hire requests ---------- */
  const kivuli = get("dj-kivuli");
  const kivuliDates = kivuli.professional?.availability ?? [];
  const hireRequests: HireRequest[] = [
    {
      id: "hire_demo_quoted",
      fanId: me,
      activationId: kivuli.id,
      details: {
        date: kivuliDates[3] ?? "",
        location: "Mbezi Beach, private villa",
        durationHours: 4,
        budget: 600_000,
        note: "Birthday party for about 60 guests. Afro house, then throwbacks after midnight.",
      },
      status: "quoted",
      quote: {
        price: 550_000,
        terms: "Four-hour set, booth and sound included. Transport within Dar es Salaam.",
        expiresAt: iso(nowMs + 3 * DAY),
      },
      history: [
        { status: "sent", at: iso(nowMs - 30 * HOUR) },
        { status: "quoted", at: iso(nowMs - 6 * HOUR) },
      ],
      createdAt: iso(nowMs - 30 * HOUR),
    },
    {
      id: "hire_incoming",
      fanId: fanPool[4]?.id ?? "u_14",
      activationId: kivuli.id,
      details: {
        date: kivuliDates[6] ?? "",
        location: "Slipway, Msasani",
        durationHours: 3,
        budget: 450_000,
        note: "Product launch for a skincare brand. Upbeat but not too loud before 9pm.",
      },
      status: "sent",
      history: [{ status: "sent", at: iso(nowMs - 3 * HOUR) }],
      createdAt: iso(nowMs - 3 * HOUR),
    },
    {
      id: "hire_neema_paid",
      fanId: me,
      activationId: get("lens-by-neema").id,
      details: {
        date: "2026-08-22",
        location: "Kilele Rooftop, Masaki",
        durationHours: 3,
        budget: 300_000,
        note: "Photos for my sister's graduation dinner.",
      },
      status: "paid",
      quote: { price: 280_000, terms: "Three hours, 80 edited photos within 48 hours.", expiresAt: iso(nowMs - 20 * DAY) },
      history: [
        { status: "sent", at: iso(nowMs - 30 * DAY) },
        { status: "quoted", at: iso(nowMs - 29 * DAY) },
        { status: "accepted", at: iso(nowMs - 28 * DAY) },
        { status: "paid", at: iso(nowMs - 28 * DAY) },
      ],
      createdAt: iso(nowMs - 30 * DAY),
    },
  ];

  /* ---------- Payouts for the demo entertainer ---------- */
  const myProviders = new Set(providers.filter((p) => p.userId === DEMO_IDS.entertainer).map((p) => p.id));
  const earned = ledger.filter((l) => l.party === "provider" && l.partyId && myProviders.has(l.partyId)).reduce((s, l) => s + l.amount, 0);
  const payouts: Payout[] = [0, 1, 2, 3].map((i) => ({
    id: `pay_${i}`,
    ownerId: DEMO_IDS.entertainer,
    amount: Math.round((earned * 0.16) / 1000) * 1000,
    phone: "+255 754 111 222",
    status: "sent",
    at: iso(nowMs - (8 + i * 21) * DAY),
  }));

  interactions.sort((x, y) => x.at.localeCompare(y.at));
  orders.sort((x, y) => y.createdAt.localeCompare(x.createdAt));

  return { users, providers, activations, interactions, reviews, orders, ledger, saves, hireRequests, payouts, settings };
}
