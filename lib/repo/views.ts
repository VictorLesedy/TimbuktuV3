import { CITY_CENTER, DEMO_IDS } from "../config";
import { db, signals } from "../mock/db";
import type { Activation, City, Provider, Signals } from "../schemas";
import { type Badge, crowdLabel, deriveBadges, rankScore } from "../signals";
import { haversineKm } from "../utils";

export type ProviderSummary = Pick<Provider, "id" | "name" | "category" | "subtype" | "verified" | "city">;

export type ActivationCard = {
  activation: Activation;
  provider: ProviderSummary;
  signals: Signals;
  badges: Badge[];
  crowdLabel: string | null;
  fromPrice: number;
  priceUnit: string;
  score: number;
  distanceKm: number | null;
  nextDate: string | null;
};

export function fromPrice(a: Activation): { price: number; unit: string } {
  if (a.event) {
    const open = a.event.tiers.filter((t) => t.sold < t.capacity);
    return { price: Math.min(...(open.length ? open : a.event.tiers).map((t) => t.price)), unit: "per ticket" };
  }
  if (a.venue) {
    return { price: Math.min(...a.venue.tableOptions.map((t) => t.deposit)), unit: "deposit" };
  }
  if (a.service) return { price: a.service.pricePerPerson, unit: "per person" };
  if (a.professional) return { price: a.professional.baseRate, unit: "from, per booking" };
  return { price: 0, unit: "" };
}

export function nextDate(a: Activation, now = Date.now()): string | null {
  if (a.event) return a.event.startsAt;
  if (a.service) return a.service.slots.find((s) => new Date(s.startsAt).getTime() > now && s.booked < s.capacity)?.startsAt ?? null;
  return null;
}

export const EMPTY_SIGNALS = (activationId: string): Signals => ({
  activationId,
  rating: 0,
  reviewCount: 0,
  repeatRate: 0,
  rhythm: Array.from({ length: 7 }, () => [0, 0, 0, 0]),
  crowd: { tierShare: { general: 0, vip: 0, table: 0 }, avgSpend: 0, sampleSize: 0 },
  momentum48h: 0,
  momentumPrev48h: 0,
  saves48h: 0,
  sales48h: 0,
  busyNow: false,
  isNew: true,
});

export function toCard(a: Activation, opts: { near?: City; ownerView?: boolean } = {}): ActivationCard {
  const w = db();
  const { signals: all, trending } = signals();
  const s = all.get(a.id) ?? EMPTY_SIGNALS(a.id);
  const provider = w.providers.find((p) => p.id === a.providerId);
  const price = fromPrice(a);
  const now = Date.now();
  const label = opts.ownerView ? crowdLabel(s, { ...w.settings, crowdLabels: { enabled: true, threshold: 1 } }) : crowdLabel(s, w.settings);
  return {
    activation: a,
    provider: provider
      ? {
          id: provider.id,
          name: provider.name,
          category: provider.category,
          subtype: provider.subtype,
          verified: provider.verified,
          city: provider.city,
        }
      : { id: "unknown", name: "Unknown", category: "venue", subtype: "club", verified: false, city: a.city },
    signals: s,
    badges: deriveBadges(s, trending),
    crowdLabel: label,
    fromPrice: price.price,
    priceUnit: price.unit,
    score: rankScore(a, s, now),
    distanceKm: opts.near ? Math.round(haversineKm(CITY_CENTER[opts.near], a.location) * 10) / 10 : null,
    nextDate: nextDate(a, now),
  };
}

export function isPubliclyVisible(a: Activation, now = Date.now()) {
  if (a.status !== "live") return false;
  if (a.event && new Date(a.event.endsAt).getTime() < now) return false;
  return true;
}

export function myProviderIds() {
  return new Set(
    db()
      .providers.filter((p) => p.userId === DEMO_IDS.entertainer)
      .map((p) => p.id),
  );
}

export function userName(id: string) {
  return db().users.find((u) => u.id === id)?.name ?? "A fan";
}

export function firstNameInitial(id: string) {
  const name = userName(id);
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : (first ?? name);
}
