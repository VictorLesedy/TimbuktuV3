import { AMBASSADOR_REQUIREMENTS, DEMO_IDS } from "../config";
import { db } from "../mock/db";
import type { ExperiencePref, FanLevel, Membership, Role, User } from "../schemas";
import { getSession, setSession } from "../session";
import { sum, uid } from "../utils";
import { ApiError, read, write } from "./client";
import { type ActivationCard, toCard } from "./views";

export type LevelProgress = {
  level: FanLevel;
  attended: number;
  reviews: number;
  shares: number;
  required: typeof AMBASSADOR_REQUIREMENTS;
  ratio: number;
  canUnlock: boolean;
  pendingEarnings: number;
};

export type Me = { user: User | null; progress: LevelProgress };

function progressFor(user: User | null): LevelProgress {
  const w = db();
  if (!user) {
    return {
      level: "explorer",
      attended: 0,
      reviews: 0,
      shares: 0,
      required: AMBASSADOR_REQUIREMENTS,
      ratio: 0,
      canUnlock: false,
      pendingEarnings: 0,
    };
  }
  const attended = w.orders.filter((o) => o.userId === user.id && o.status === "paid" && o.checkedInAt).length;
  const reviews = w.reviews.filter((r) => r.userId === user.id).length;
  const shares = w.interactions.filter((i) => i.userId === user.id && i.kind === "share").length;
  const r = AMBASSADOR_REQUIREMENTS;
  const ratio =
    (Math.min(attended, r.attended) / r.attended + Math.min(reviews, r.reviews) / r.reviews + Math.min(shares, r.shares) / r.shares) / 3;
  const pendingEarnings = sum(w.ledger.filter((l) => l.party === "ambassador" && l.partyId === user.id).map((l) => l.amount));
  return {
    level: user.fanLevel,
    attended,
    reviews,
    shares,
    required: r,
    ratio,
    canUnlock: user.fanLevel === "member" && ratio >= 1,
    pendingEarnings,
  };
}

function meUser() {
  const u = db().users.find((x) => x.id === DEMO_IDS.fan);
  if (!u) throw new ApiError("Your profile could not be loaded.", "not_found");
  return u;
}

export async function getMe(): Promise<Me> {
  return read(() => {
    if (!getSession().signedIn) return { user: null, progress: progressFor(null) };
    const user = meUser();
    return { user, progress: progressFor(user) };
  });
}

export async function quickRegister(input: { name: string; phone: string }): Promise<Me> {
  return write(() => {
    const user = meUser();
    user.name = input.name.trim();
    user.phone = input.phone;
    if (user.fanLevel === "explorer") user.fanLevel = "member";
    setSession({ signedIn: true });
    return { user, progress: progressFor(user) };
  });
}

export type OnboardingInput = {
  role: "fan" | "entertainer";
  name: string;
  phone: string;
  city: User["city"];
  favouriteArtists: string[];
  experiencePref: ExperiencePref;
  membership: Membership;
  business?: { name: string; category: "venue" | "person" | "service" };
};

export async function completeOnboarding(input: OnboardingInput): Promise<Me> {
  return write(() => {
    const w = db();
    const user = meUser();
    Object.assign(user, {
      name: input.name,
      phone: input.phone,
      city: input.city,
      favouriteArtists: input.favouriteArtists,
      experiencePref: input.experiencePref,
      membership: input.membership,
      fanLevel: user.fanLevel === "explorer" ? "member" : user.fanLevel,
    } satisfies Partial<User>);
    if (input.role === "entertainer" && input.business) {
      const roles: Role[] = user.roles.includes("entertainer") ? user.roles : [...user.roles, "entertainer"];
      user.roles = roles;
      const subtype = input.business.category === "venue" ? "club" : input.business.category === "person" ? "dj" : "tour_company";
      w.providers.push({
        id: uid("p"),
        userId: user.id,
        name: input.business.name,
        category: input.business.category,
        subtype,
        verified: false,
        reviewState: "pending",
        city: input.city,
        createdAt: new Date().toISOString(),
        payoutPhone: input.phone,
      });
    }
    setSession({ signedIn: true });
    return { user, progress: progressFor(user) };
  });
}

export async function unlockAmbassador(): Promise<Me> {
  return write(() => {
    const user = meUser();
    const p = progressFor(user);
    if (!p.canUnlock) throw new ApiError("Finish the three requirements first. Your progress is shown above.", "forbidden");
    user.fanLevel = "ambassador";
    user.ambassadorSince = new Date().toISOString();
    return { user, progress: progressFor(user) };
  });
}

/** Demo control used by the role switcher. */
export async function setDemoFanLevel(level: FanLevel): Promise<void> {
  return write(() => {
    const user = meUser();
    if (level === "explorer") {
      setSession({ signedIn: false });
      return;
    }
    setSession({ signedIn: true });
    user.fanLevel = level;
    user.ambassadorSince = level === "ambassador" ? (user.ambassadorSince ?? new Date().toISOString()) : null;
  });
}

/* ---------- Saves and shares ---------- */

export async function toggleSave(activationId: string, save: boolean): Promise<{ saved: boolean }> {
  return write(() => {
    if (!getSession().signedIn) throw new ApiError("Create an account to save places and events.", "forbidden");
    const w = db();
    const existing = w.saves.findIndex((s) => s.userId === DEMO_IDS.fan && s.activationId === activationId);
    if (save && existing < 0) {
      const at = new Date().toISOString();
      w.saves.push({ userId: DEMO_IDS.fan, activationId, at });
      w.interactions.push({ id: uid("int"), activationId, userId: DEMO_IDS.fan, kind: "save", at });
    }
    if (!save && existing >= 0) w.saves.splice(existing, 1);
    return { saved: save };
  });
}

export async function listSaved(): Promise<ActivationCard[]> {
  return read(() => {
    if (!getSession().signedIn) return [];
    const w = db();
    return w.saves
      .filter((s) => s.userId === DEMO_IDS.fan)
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((s) => w.activations.find((a) => a.id === s.activationId))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => toCard(a));
  });
}

export async function recordShare(activationId: string, channel: string): Promise<{ channel: string }> {
  return write(() => {
    const at = new Date().toISOString();
    db().interactions.push({ id: uid("int"), activationId, userId: getSession().signedIn ? DEMO_IDS.fan : "anon", kind: "share", at });
    return { channel };
  });
}

export type ActivityItem = { id: string; kind: "share" | "checkin" | "save"; title: string; slug: string; at: string };

export async function listActivity(): Promise<ActivityItem[]> {
  return read(() => {
    const w = db();
    return w.interactions
      .filter((i) => i.userId === DEMO_IDS.fan && (i.kind === "share" || i.kind === "checkin" || i.kind === "save"))
      .slice(-30)
      .reverse()
      .map((i) => {
        const a = w.activations.find((x) => x.id === i.activationId);
        return { id: i.id, kind: i.kind as ActivityItem["kind"], title: a?.title ?? "", slug: a?.slug ?? "", at: i.at };
      });
  });
}

/* ---------- Ambassador ---------- */

export type AmbassadorStats = {
  unlocked: boolean;
  referralLink: string;
  followers: number;
  salesDriven: number;
  grossDriven: number;
  earnings: number;
  balance: number;
  weekly: { week: string; earnings: number; sales: number }[];
  payouts: { id: string; amount: number; phone: string; status: string; at: string }[];
  recent: { id: string; title: string; amount: number; at: string }[];
};

export async function getAmbassadorStats(): Promise<AmbassadorStats> {
  return read(() => {
    const w = db();
    const user = meUser();
    const entries = w.ledger.filter((l) => l.party === "ambassador" && l.partyId === user.id);
    const sales = w.interactions.filter((i) => i.userId === user.id && i.kind === "referral_sale");
    const earnings = sum(entries.map((e) => e.amount));
    const payouts = w.payouts.filter((p) => p.ownerId === user.id).sort((a, b) => b.at.localeCompare(a.at));
    const paidOut = sum(payouts.map((p) => p.amount));
    const now = Date.now();
    const weekly = Array.from({ length: 8 }, (_, idx) => {
      const i = 7 - idx;
      const from = now - (i + 1) * 7 * 86_400_000;
      const to = now - i * 7 * 86_400_000;
      const inRange = (at: string) => {
        const t = new Date(at).getTime();
        return t > from && t <= to;
      };
      const label = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(to));
      return {
        week: label,
        earnings: sum(entries.filter((e) => inRange(e.at)).map((e) => e.amount)),
        sales: sales.filter((s) => inRange(s.at)).length,
      };
    });
    const recent = sales
      .slice(-8)
      .reverse()
      .map((s) => ({ id: s.id, title: w.activations.find((a) => a.id === s.activationId)?.title ?? "", amount: s.amount ?? 0, at: s.at }));
    return {
      unlocked: user.fanLevel === "ambassador",
      referralLink: `https://timbuktu.co.tz/?ref=${user.referralCode}`,
      followers: user.followers,
      salesDriven: sales.length,
      grossDriven: sum(sales.map((s) => s.amount ?? 0)),
      earnings,
      balance: earnings - paidOut,
      weekly,
      payouts,
      recent,
    };
  });
}

export async function requestAmbassadorPayout(amount: number, phone: string) {
  return write(() => {
    const w = db();
    const user = meUser();
    if (user.fanLevel !== "ambassador") throw new ApiError("Unlock ambassador to withdraw earnings.", "forbidden");
    const earnings = sum(w.ledger.filter((l) => l.party === "ambassador" && l.partyId === user.id).map((l) => l.amount));
    const paid = sum(w.payouts.filter((p) => p.ownerId === user.id).map((p) => p.amount));
    if (amount < 5000) throw new ApiError("Withdraw at least TSh 5,000.");
    if (amount > earnings - paid) throw new ApiError("That is more than your available balance. Lower the amount.");
    const payout = { id: uid("pay"), ownerId: user.id, amount, phone, status: "processing" as const, at: new Date().toISOString() };
    w.payouts.push(payout);
    return payout;
  });
}
