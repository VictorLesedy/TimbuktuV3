import { bandOfHour, DAYS, nightDayIndex } from "./config";
import type { Activation, Interaction, InteractionKind, Review, Settings, Signals } from "./schemas";

/*
 * The living layer. Everything here is computed from interactions and reviews;
 * nothing is hard-coded per activation.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const RECENCY_HALF_LIFE_DAYS = 21;
const NEW_WINDOW_DAYS = 14;

const MOMENTUM_WEIGHT: Record<InteractionKind, number> = {
  view: 0.2,
  save: 1,
  share: 1.5,
  purchase: 3,
  booking: 3,
  checkin: 1,
  review: 1,
  referral_sale: 2,
};

const decay = (ageMs: number) => 0.5 ** (ageMs / (RECENCY_HALF_LIFE_DAYS * DAY));

export function computeSignals(activation: Activation, interactions: Interaction[], reviews: Review[], now: number): Signals {
  const rhythmRaw = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  const tierWeight = { general: 0, vip: 0, table: 0 };
  let spendWeighted = 0;
  let spendWeight = 0;
  let sampleSize = 0;
  let momentum = 0;
  let momentumPrev = 0;
  let saves48h = 0;
  let sales48h = 0;
  let recentCheckins = 0;
  const visitsByUser = new Map<string, number>();

  for (const i of interactions) {
    const t = new Date(i.at).getTime();
    const age = now - t;
    if (age < 0) continue;
    const w = decay(age);

    if (i.kind === "checkin") {
      const d = new Date(t);
      const row = rhythmRaw[nightDayIndex(d)];
      const band = bandOfHour(d.getHours());
      if (row) row[band] = (row[band] ?? 0) + w;
      if (age < 3 * HOUR) recentCheckins += 1;
    }
    if (i.kind === "purchase" || i.kind === "booking") {
      sampleSize += 1;
      if (i.tier) tierWeight[i.tier] += w;
      if (i.amount) {
        spendWeighted += i.amount * w;
        spendWeight += w;
      }
    }
    if (i.kind === "checkin" || i.kind === "purchase" || i.kind === "booking") {
      visitsByUser.set(i.userId, (visitsByUser.get(i.userId) ?? 0) + 1);
    }
    if (age <= 48 * HOUR) {
      momentum += MOMENTUM_WEIGHT[i.kind] * Math.exp(-age / (24 * HOUR));
      if (i.kind === "save") saves48h += 1;
      if (i.kind === "purchase" || i.kind === "booking") sales48h += 1;
    } else if (age <= 96 * HOUR) {
      momentumPrev += MOMENTUM_WEIGHT[i.kind] * Math.exp(-(age - 48 * HOUR) / (24 * HOUR));
    }
  }

  const peak = Math.max(0, ...rhythmRaw.flat());
  const rhythm = rhythmRaw.map((row) => row.map((v) => (peak > 0 ? Math.round((v / peak) * 100) / 100 : 0)));

  const tierTotal = tierWeight.general + tierWeight.vip + tierWeight.table;
  const share = (v: number) => (tierTotal > 0 ? Math.round((v / tierTotal) * 100) / 100 : 0);

  const visitors = [...visitsByUser.values()];
  const repeatRate = visitors.length ? visitors.filter((v) => v > 1).length / visitors.length : 0;

  const verified = reviews.filter((r) => r.verified);
  const rating = verified.length ? verified.reduce((s, r) => s + r.rating, 0) / verified.length : 0;

  const nowDate = new Date(now);
  const today = nightDayIndex(nowDate);
  const band = bandOfHour(nowDate.getHours());
  const rhythmNow = rhythm[today]?.[band] ?? 0;
  const eventLive =
    activation.event !== undefined &&
    new Date(activation.event.startsAt).getTime() <= now &&
    new Date(activation.event.endsAt).getTime() >= now;
  const openToday = activation.venue ? activation.venue.openDays.includes(today) : true;
  const busyNow = eventLive || recentCheckins >= 2 || (activation.type === "venue" && openToday && rhythmNow >= 0.5);

  return {
    activationId: activation.id,
    rating: Math.round(rating * 10) / 10,
    reviewCount: verified.length,
    repeatRate: Math.round(repeatRate * 100) / 100,
    rhythm,
    crowd: {
      tierShare: { general: share(tierWeight.general), vip: share(tierWeight.vip), table: share(tierWeight.table) },
      avgSpend: spendWeight > 0 ? Math.round(spendWeighted / spendWeight / 1000) * 1000 : 0,
      sampleSize,
    },
    momentum48h: Math.round(momentum * 10) / 10,
    momentumPrev48h: Math.round(momentumPrev * 10) / 10,
    saves48h,
    sales48h,
    busyNow,
    isNew: now - new Date(activation.createdAt).getTime() < NEW_WINDOW_DAYS * DAY,
  };
}

export function computeAllSignals(activations: Activation[], interactions: Interaction[], reviews: Review[], now: number) {
  const byActivation = new Map<string, Interaction[]>();
  for (const i of interactions) {
    const list = byActivation.get(i.activationId);
    if (list) list.push(i);
    else byActivation.set(i.activationId, [i]);
  }
  const reviewsBy = new Map<string, Review[]>();
  for (const r of reviews) {
    const list = reviewsBy.get(r.activationId);
    if (list) list.push(r);
    else reviewsBy.set(r.activationId, [r]);
  }
  const out = new Map<string, Signals>();
  for (const a of activations) {
    out.set(a.id, computeSignals(a, byActivation.get(a.id) ?? [], reviewsBy.get(a.id) ?? [], now));
  }
  return out;
}

/** Ranking used by "Trending now". New activations get a boost that fades over two weeks. */
export function rankScore(activation: Activation, s: Signals, now: number) {
  const ageDays = (now - new Date(activation.createdAt).getTime()) / DAY;
  const boost = s.isNew ? 30 * Math.max(0, 1 - ageDays / NEW_WINDOW_DAYS) : 0;
  return s.momentum48h + boost;
}

export type BadgeId = "new" | "trending" | "rising" | "top_rated" | "busiest";
export type Badge = { id: BadgeId; label: string; live: boolean };

export function peakDay(s: Signals) {
  const totals = s.rhythm.map((row) => row.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals);
  const mean = totals.reduce((a, b) => a + b, 0) / (totals.length || 1);
  return { day: totals.indexOf(max), max, mean };
}

export function deriveBadges(s: Signals, trendingIds: Set<string>): Badge[] {
  const badges: Badge[] = [];
  if (s.isNew) badges.push({ id: "new", label: "New on Timbuktu", live: false });
  if (trendingIds.has(s.activationId)) badges.push({ id: "trending", label: "Trending now", live: true });
  else if (s.momentum48h >= 8 && s.momentum48h >= 1.6 * Math.max(s.momentumPrev48h, 1)) {
    badges.push({ id: "rising", label: "Rising", live: true });
  }
  if (s.rating >= 4.4 && s.reviewCount >= 8) badges.push({ id: "top_rated", label: "Top rated", live: false });
  const peak = peakDay(s);
  if (peak.max > 0 && peak.max >= 1.7 * peak.mean) {
    badges.push({ id: "busiest", label: `Busiest on ${DAYS[peak.day]}s`, live: false });
  }
  return badges;
}

/** Public crowd label. Hidden unless the admin flag is on and the sample is large enough. */
export function crowdLabel(s: Signals, settings: Settings): string | null {
  if (!settings.crowdLabels.enabled) return null;
  if (s.crowd.sampleSize < settings.crowdLabels.threshold) return null;
  const { general, vip, table } = s.crowd.tierShare;
  if (vip >= 0.45) return "Mostly VIP crowd";
  if (table >= 0.4) return "Big on table bookings";
  if (general >= 0.7) return "Mostly general entry";
  return "Mixed crowd";
}

export function trendingSet(activations: Activation[], signals: Map<string, Signals>, now: number, size = 6) {
  const ranked = activations
    .map((a) => ({ a, s: signals.get(a.id) }))
    .filter((x): x is { a: Activation; s: Signals } => !!x.s && x.s.momentum48h >= 12)
    .sort((x, y) => rankScore(y.a, y.s, now) - rankScore(x.a, x.s, now))
    .slice(0, size);
  return new Set(ranked.map((x) => x.a.id));
}
