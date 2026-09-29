import { bandOfHour, DEMO_IDS, dayIndex, nightDayIndex } from "../config";
import { fromDateKey } from "../format";
import { splitOrder } from "../ledger";
import { commit, db, pushLiveEvent, signals } from "../mock/db";
import type { ActivationType, City, Order } from "../schemas";
import { getSession } from "../session";
import { uid } from "../utils";
import { ApiError, read } from "./client";
import { type ActivationCard, firstNameInitial, isPubliclyVisible, myProviderIds, toCard } from "./views";

export type ExploreSort = "trending" | "top_rated" | "nearest" | "newest";

export type ExploreFilters = {
  type: ActivationType | null;
  city: City | null;
  date: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  vibe: number | null;
  sort: ExploreSort;
  near: City;
  q?: string | null;
};

function availableOn(card: ActivationCard, dateKey: string) {
  const a = card.activation;
  const date = fromDateKey(dateKey);
  if (a.event) return a.event.startsAt.slice(0, 10) === dateKey || new Date(a.event.startsAt).toDateString() === date.toDateString();
  if (a.venue) return a.venue.openDays.includes(dayIndex(date));
  if (a.service) return a.service.slots.some((s) => new Date(s.startsAt).toDateString() === date.toDateString() && s.booked < s.capacity);
  if (a.professional) return a.professional.availability.includes(dateKey);
  return false;
}

export async function listActivations(f: ExploreFilters): Promise<ActivationCard[]> {
  return read(() => {
    const now = Date.now();
    let cards = db()
      .activations.filter((a) => isPubliclyVisible(a, now))
      .filter((a) => !f.type || a.type === f.type)
      .filter((a) => !f.city || a.city === f.city)
      .map((a) => toCard(a, { near: f.near }));

    if (f.q) {
      const q = f.q.toLowerCase();
      cards = cards.filter((c) => `${c.activation.title} ${c.provider.name} ${c.activation.location.area}`.toLowerCase().includes(q));
    }
    if (f.date) cards = cards.filter((c) => availableOn(c, f.date as string));
    if (f.minPrice != null) cards = cards.filter((c) => c.fromPrice >= (f.minPrice as number));
    if (f.maxPrice != null) cards = cards.filter((c) => c.fromPrice <= (f.maxPrice as number));
    if (f.vibe != null) {
      const day = f.vibe;
      cards = cards.filter((c) => Math.max(...(c.signals.rhythm[day] ?? [0])) >= 0.55);
    }

    const sorters: Record<ExploreSort, (a: ActivationCard, b: ActivationCard) => number> = {
      trending: (a, b) => b.score - a.score,
      top_rated: (a, b) => b.signals.rating - a.signals.rating || b.signals.reviewCount - a.signals.reviewCount,
      nearest: (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0),
      newest: (a, b) => b.activation.createdAt.localeCompare(a.activation.createdAt),
    };
    return cards.sort(sorters[f.sort]);
  });
}

export type HomeData = {
  trending: ActivationCard[];
  busyToday: ActivationCard[];
  nearYou: ActivationCard[];
  counts: Record<ActivationType, number>;
  todayIndex: number;
};

export async function getHome(city: City): Promise<HomeData> {
  return read(() => {
    const now = Date.now();
    const visible = db().activations.filter((a) => isPubliclyVisible(a, now));
    const cards = visible.map((a) => toCard(a, { near: city }));
    const today = nightDayIndex(new Date(now));
    const busyScore = (c: ActivationCard) => {
      const row = c.signals.rhythm[today] ?? [0, 0, 0, 0];
      return Math.max(row[1] ?? 0, row[2] ?? 0, row[3] ?? 0, row[0] ?? 0);
    };
    const counts = { event: 0, venue: 0, service: 0, professional: 0 } satisfies Record<ActivationType, number>;
    for (const a of visible) counts[a.type] += 1;
    return {
      trending: cards
        .filter((c) => c.badges.some((b) => b.id === "trending" || b.id === "rising" || b.id === "new"))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
      busyToday: cards
        .filter((c) => c.activation.type !== "professional" && busyScore(c) >= 0.5)
        .sort((a, b) => busyScore(b) - busyScore(a))
        .slice(0, 8),
      nearYou: cards
        .filter((c) => c.activation.city === city)
        .sort((a, b) => b.signals.rating - a.signals.rating)
        .slice(0, 8),
      counts,
      todayIndex: today,
    };
  });
}

export type ActivationDetail = ActivationCard & {
  reviews: { id: string; author: string; rating: number; text: string; verified: boolean; at: string }[];
  isOwner: boolean;
  saved: boolean;
};

export async function getActivation(slug: string): Promise<ActivationDetail> {
  return read(() => {
    const w = db();
    const a = w.activations.find((x) => x.slug === slug);
    if (!a) throw new ApiError("This listing does not exist. It may have been removed.", "not_found");
    const isOwner = myProviderIds().has(a.providerId);
    if (a.status !== "live" && !isOwner) {
      throw new ApiError("This listing is not live right now. Check back later or explore something else.", "not_found");
    }
    const reviews = w.reviews
      .filter((r) => r.activationId === a.id && r.verified)
      .sort((x, y) => y.at.localeCompare(x.at))
      .slice(0, 12)
      .map((r) => ({ id: r.id, author: firstNameInitial(r.userId), rating: r.rating, text: r.text, verified: r.verified, at: r.at }));
    const saved = getSession().signedIn && w.saves.some((s) => s.userId === DEMO_IDS.fan && s.activationId === a.id);
    return { ...toCard(a, { ownerView: false }), reviews, isOwner, saved };
  });
}

export async function recordView(activationId: string) {
  // Fire-and-forget analytics. No latency, no failure.
  const w = db();
  w.interactions.push({
    id: uid("int"),
    activationId,
    userId: getSession().signedIn ? DEMO_IDS.fan : "anon",
    kind: "view",
    at: new Date().toISOString(),
  });
}

/* ---------- Live feel ---------- */

const LIVE_KINDS = [
  ["save", 34],
  ["purchase", 26],
  ["checkin", 26],
  ["share", 14],
] as const;

/**
 * Simulates one crowd interaction. Called every 20–30 seconds by the client.
 * Returns what happened so the UI can mention it.
 */
export function simulateCrowdTick() {
  const w = db();
  const now = new Date();
  const { signals: s } = signals();
  const live = w.activations.filter((a) => isPubliclyVisible(a));
  if (!live.length) return null;
  const weights = live.map((a) => {
    const sig = s.get(a.id);
    const band = bandOfHour(now.getHours());
    const rhythmNow = sig?.rhythm[nightDayIndex(now)]?.[band] ?? 0;
    return [a, 1 + (sig?.momentum48h ?? 0) / 10 + rhythmNow * 3] as const;
  });
  let r = Math.random() * weights.reduce((t, [, x]) => t + x, 0);
  let a = live[0];
  for (const [candidate, weight] of weights) {
    r -= weight;
    if (r <= 0) {
      a = candidate;
      break;
    }
  }
  if (!a) return null;
  let r2 = Math.random() * 100;
  let kind: (typeof LIVE_KINDS)[number][0] = "save";
  for (const [k, weight] of LIVE_KINDS) {
    r2 -= weight;
    if (r2 <= 0) {
      kind = k;
      break;
    }
  }
  const fans = w.users.filter((u) => /^u_\d+$/.test(u.id));
  const fan = fans[Math.floor(Math.random() * fans.length)];
  if (!fan) return null;
  const at = now.toISOString();

  if (kind === "purchase" && a.event) {
    const tier = a.event.tiers.find((t) => t.sold < t.capacity);
    if (tier) {
      tier.sold += 1;
      // Ambassadors see link sales arrive live.
      const me = w.users.find((u) => u.id === DEMO_IDS.fan);
      const referrerId = me?.fanLevel === "ambassador" && Math.random() < 0.35 ? DEMO_IDS.fan : undefined;
      const order: Order = {
        id: uid("ord"),
        code: `TBK-${Math.floor(100000 + Math.random() * 900000)}`,
        userId: fan.id,
        activationId: a.id,
        kind: "ticket",
        lines: [{ label: `${tier.name} ticket`, unitPrice: tier.price, qty: 1, tierId: tier.id }],
        discount: 0,
        total: tier.price,
        status: "paid",
        createdAt: at,
        scheduledFor: a.event.startsAt,
        referrerId,
      };
      w.orders.push(order);
      w.ledger.push(...splitOrder(order, a, w.settings, uid));
      w.interactions.push({
        id: uid("int"),
        activationId: a.id,
        userId: fan.id,
        kind: "purchase",
        amount: tier.price,
        tier: tier.id === "early" ? "general" : "vip",
        at,
      });
      if (referrerId) {
        w.interactions.push({ id: uid("int"), activationId: a.id, userId: referrerId, kind: "referral_sale", amount: tier.price, at });
      }
    }
  } else {
    const k = kind === "purchase" ? "save" : kind;
    w.interactions.push({ id: uid("int"), activationId: a.id, userId: fan.id, kind: k, at });
  }

  const verb = { save: "saved", purchase: a.event ? "got tickets for" : "saved", checkin: "just arrived at", share: "shared" }[kind];
  const event = { id: uid("live"), activationId: a.id, text: `${fan.name.split(" ")[0]} ${verb} ${a.title}`, at };
  pushLiveEvent(event);
  commit();
  return event;
}
