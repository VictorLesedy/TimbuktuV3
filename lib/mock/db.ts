import { toDateKey } from "../format";
import type { Signals } from "../schemas";
import { computeAllSignals, trendingSet } from "../signals";
import { generateWorld, type World } from "./seed";

/*
 * In-browser mock database. Seeded once per day, with the demo user's changes
 * kept in localStorage so a reload does not lose progress.
 * Only lib/repo/* may import this file.
 */

const STORAGE_KEY = "timbuktu-demo-v1";

type Persisted = {
  day: string;
  added: {
    interactions: World["interactions"];
    orders: World["orders"];
    ledger: World["ledger"];
    reviews: World["reviews"];
    payouts: World["payouts"];
  };
  orderPatches: Record<string, Partial<World["orders"][number]>>;
  replaced: Pick<World, "activations" | "providers" | "hireRequests" | "saves" | "settings"> & { users: World["users"] };
};

type Baseline = { interactions: number; orders: number; ledger: number; reviews: number; payouts: number };

export type LiveEvent = { id: string; activationId: string; text: string; at: string };

let world: World | null = null;
let baseline: Baseline | null = null;
let version = 0;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const orderPatches: Record<string, Partial<World["orders"][number]>> = {};
const listeners = new Set<() => void>();
export const liveEvents: LiveEvent[] = [];

const DEMO_USER_IDS = new Set(["u_me", "u_ent", "u_admin"]);

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function load(w: World) {
  if (!canUseStorage()) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Persisted;
    if (saved.day !== toDateKey(new Date())) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    w.interactions.push(...saved.added.interactions);
    w.orders.push(...saved.added.orders);
    w.ledger.push(...saved.added.ledger);
    w.reviews.push(...saved.added.reviews);
    w.payouts.push(...saved.added.payouts);
    for (const [id, patch] of Object.entries(saved.orderPatches)) {
      const order = w.orders.find((o) => o.id === id);
      if (order) Object.assign(order, patch);
      orderPatches[id] = patch;
    }
    w.activations = saved.replaced.activations;
    w.providers = saved.replaced.providers;
    w.hireRequests = saved.replaced.hireRequests;
    w.saves = saved.replaced.saves;
    w.settings = saved.replaced.settings;
    w.users = w.users.map((u) => saved.replaced.users.find((s) => s.id === u.id) ?? u);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function persistNow() {
  if (!world || !baseline || !canUseStorage()) return;
  const w = world;
  const b = baseline;
  const data: Persisted = {
    day: toDateKey(new Date()),
    added: {
      interactions: w.interactions.slice(b.interactions),
      orders: w.orders.slice(b.orders),
      ledger: w.ledger.slice(b.ledger),
      reviews: w.reviews.slice(b.reviews),
      payouts: w.payouts.slice(b.payouts),
    },
    orderPatches,
    replaced: {
      activations: w.activations,
      providers: w.providers,
      hireRequests: w.hireRequests,
      saves: w.saves,
      settings: w.settings,
      users: w.users.filter((u) => DEMO_USER_IDS.has(u.id)),
    },
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the demo keeps working in memory.
  }
}

export function db(): World {
  if (!world) {
    const w = generateWorld();
    baseline = {
      interactions: w.interactions.length,
      orders: w.orders.length,
      ledger: w.ledger.length,
      reviews: w.reviews.length,
      payouts: w.payouts.length,
    };
    load(w);
    world = w;
  }
  return world;
}

/** Record a change to a seeded order so it survives reloads. */
export function patchOrder(id: string, patch: Partial<World["orders"][number]>) {
  const order = db().orders.find((o) => o.id === id);
  if (!order) return;
  Object.assign(order, patch);
  if (baseline && db().orders.indexOf(order) < baseline.orders) {
    orderPatches[id] = { ...orderPatches[id], ...patch };
  }
}

export function commit() {
  version += 1;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 150);
  for (const l of listeners) l();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVersion() {
  return version;
}

export function resetDb() {
  if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY);
  world = null;
  baseline = null;
  for (const k of Object.keys(orderPatches)) delete orderPatches[k];
  liveEvents.length = 0;
  commit();
}

let signalCache: { version: number; at: number; signals: Map<string, Signals>; trending: Set<string> } | null = null;

/** Signals are recomputed when data changes, or at most once a minute as time passes. */
export function signals() {
  const now = Date.now();
  if (!signalCache || signalCache.version !== version || now - signalCache.at > 60_000) {
    const w = db();
    const s = computeAllSignals(w.activations, w.interactions, w.reviews, now);
    const live = w.activations.filter((a) => a.status === "live");
    signalCache = { version, at: now, signals: s, trending: trendingSet(live, s, now) };
  }
  return signalCache;
}

export function pushLiveEvent(e: LiveEvent) {
  liveEvents.unshift(e);
  liveEvents.length = Math.min(liveEvents.length, 12);
}
