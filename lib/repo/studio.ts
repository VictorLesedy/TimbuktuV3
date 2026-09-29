import { DEMO_IDS } from "../config";
import { db, patchOrder, signals } from "../mock/db";
import type { Activation, ActivationType, Order, Signals } from "../schemas";
import { sum, uid } from "../utils";
import { ApiError, read, write } from "./client";
import { type ActivationCard, EMPTY_SIGNALS, myProviderIds, toCard, userName } from "./views";

const DAY = 86_400_000;

function mine() {
  const providers = myProviderIds();
  const activations = db().activations.filter((a) => providers.has(a.providerId));
  return { providers, activations, ids: new Set(activations.map((a) => a.id)) };
}

export type StudioOverview = {
  sales: { today: number; week: number; month: number; todayCount: number; weekCount: number; monthCount: number };
  upcoming: {
    id: string;
    code: string;
    fan: string;
    title: string;
    kind: Order["kind"];
    when: string;
    total: number;
    checkedIn: boolean;
  }[];
  activations: { id: string; title: string; type: ActivationType; signals: Signals; crowdLabel: string | null }[];
  momentumTrend: { day: string; momentum: number; sales: number }[];
  reviews: { id: string; author: string; title: string; rating: number; text: string; at: string }[];
  pendingHire: number;
  ownerFirstName: string;
};

export async function getStudioOverview(): Promise<StudioOverview> {
  return read(() => {
    const w = db();
    const { ids, activations } = mine();
    const now = Date.now();
    const myOrders = w.orders.filter((o) => ids.has(o.activationId) && o.status === "paid");
    const within = (o: Order, days: number) => now - new Date(o.createdAt).getTime() <= days * DAY;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const today = myOrders.filter((o) => new Date(o.createdAt) >= startOfToday);
    const week = myOrders.filter((o) => within(o, 7));
    const month = myOrders.filter((o) => within(o, 30));
    const title = (id: string) => w.activations.find((a) => a.id === id)?.title ?? "";

    const upcoming = myOrders
      .filter((o) => o.scheduledFor && new Date(o.scheduledFor).getTime() > now - 6 * 3_600_000)
      .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""))
      .slice(0, 6)
      .map((o) => ({
        id: o.id,
        code: o.code,
        fan: userName(o.userId),
        title: title(o.activationId),
        kind: o.kind,
        when: o.scheduledFor ?? o.createdAt,
        total: o.total,
        checkedIn: Boolean(o.checkedInAt),
      }));

    const weights: Record<string, number> = {
      view: 0.2,
      save: 1,
      share: 1.5,
      purchase: 3,
      booking: 3,
      checkin: 1,
      review: 1,
      referral_sale: 2,
    };
    const trend = Array.from({ length: 14 }, (_, idx) => {
      const d = new Date(now - (13 - idx) * DAY);
      d.setHours(0, 0, 0, 0);
      return {
        start: d.getTime(),
        day: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d),
        momentum: 0,
        sales: 0,
      };
    });
    for (const i of w.interactions) {
      if (!ids.has(i.activationId)) continue;
      const t = new Date(i.at).getTime();
      if (t < (trend[0]?.start ?? 0)) continue;
      const bucket = trend.findLast((b) => b.start <= t);
      if (!bucket) continue;
      bucket.momentum += weights[i.kind] ?? 0;
      if (i.kind === "purchase" || i.kind === "booking") bucket.sales += 1;
    }

    const { signals: all } = signals();
    const reviews = w.reviews
      .filter((r) => ids.has(r.activationId))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 4)
      .map((r) => ({ id: r.id, author: userName(r.userId), title: title(r.activationId), rating: r.rating, text: r.text, at: r.at }));

    return {
      sales: {
        today: sum(today.map((o) => o.total)),
        week: sum(week.map((o) => o.total)),
        month: sum(month.map((o) => o.total)),
        todayCount: today.length,
        weekCount: week.length,
        monthCount: month.length,
      },
      upcoming,
      activations: activations
        .filter((a) => a.status === "live" || a.status === "paused")
        .map((a) => {
          const card = toCard(a, { ownerView: true });
          return { id: a.id, title: a.title, type: a.type, signals: all.get(a.id) ?? EMPTY_SIGNALS(a.id), crowdLabel: card.crowdLabel };
        }),
      momentumTrend: trend.map(({ day, momentum, sales }) => ({ day, momentum: Math.round(momentum), sales })),
      reviews,
      pendingHire: w.hireRequests.filter((h) => ids.has(h.activationId) && h.status === "sent").length,
      ownerFirstName: (w.users.find((u) => u.id === DEMO_IDS.entertainer)?.name ?? "there").split(" ")[0] ?? "there",
    };
  });
}

export async function listStudioActivations(): Promise<ActivationCard[]> {
  return read(() =>
    mine()
      .activations.map((a) => toCard(a, { ownerView: true }))
      .sort((a, b) => b.activation.createdAt.localeCompare(a.activation.createdAt)),
  );
}

export async function setActivationPaused(id: string, paused: boolean) {
  return write(() => {
    const a = mine().activations.find((x) => x.id === id);
    if (!a) throw new ApiError("You can only change your own listings.", "forbidden");
    if (paused && a.status !== "live") throw new ApiError("Only live listings can be paused.", "conflict");
    if (!paused && a.status !== "paused") throw new ApiError("Only paused listings can be resumed.", "conflict");
    a.status = paused ? "paused" : "live";
    return a;
  });
}

export async function quickEditActivation(id: string, patch: { title: string; description: string }) {
  return write(() => {
    const a = mine().activations.find((x) => x.id === id);
    if (!a) throw new ApiError("You can only change your own listings.", "forbidden");
    if (patch.title.trim().length < 3) throw new ApiError("Titles need at least 3 characters.");
    a.title = patch.title.trim();
    a.description = patch.description.trim();
    return a;
  });
}

export type NewActivationInput = Omit<Activation, "id" | "slug" | "status" | "featured" | "createdAt" | "providerId" | "city"> & {
  submit: boolean;
};

export async function createActivation(input: NewActivationInput): Promise<Activation> {
  return write(() => {
    const w = db();
    const providers = w.providers.filter((p) => p.userId === DEMO_IDS.entertainer);
    const categoryFor: Record<ActivationType, string[]> = {
      event: ["venue", "service", "person"],
      venue: ["venue"],
      service: ["service"],
      professional: ["person"],
    };
    const provider =
      providers.find((p) => categoryFor[input.type].includes(p.category) && (input.type !== "event" || p.category === "venue")) ??
      providers.find((p) => categoryFor[input.type].includes(p.category));
    if (!provider) throw new ApiError(`None of your profiles can list a ${input.type}. Add a matching profile first.`, "forbidden");
    const base =
      input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "listing";
    let slug = base;
    let n = 2;
    while (w.activations.some((a) => a.slug === slug)) slug = `${base}-${n++}`;
    const { submit, ...rest } = input;
    const activation: Activation = {
      ...rest,
      id: uid("a"),
      slug,
      providerId: provider.id,
      city: provider.city,
      status: submit ? "pending" : "draft",
      featured: false,
      createdAt: new Date().toISOString(),
    };
    w.activations.push(activation);
    return activation;
  });
}

export async function submitDraft(id: string) {
  return write(() => {
    const a = mine().activations.find((x) => x.id === id);
    if (!a) throw new ApiError("You can only submit your own listings.", "forbidden");
    if (a.status !== "draft" && a.status !== "changes_requested") throw new ApiError("Only drafts can be submitted.", "conflict");
    a.status = "pending";
    a.moderationNote = undefined;
    return a;
  });
}

export type InboxOrder = Order & { fan: string; title: string; type: ActivationType };

export async function listStudioBookings(): Promise<InboxOrder[]> {
  return read(() => {
    const w = db();
    const { ids } = mine();
    return w.orders
      .filter((o) => ids.has(o.activationId) && o.status === "paid")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 60)
      .map((o) => {
        const a = w.activations.find((x) => x.id === o.activationId);
        return { ...o, fan: userName(o.userId), title: a?.title ?? "", type: a?.type ?? "event" };
      });
  });
}

export type CheckInTarget = { id: string; title: string; when: string | null; expected: number; checkedIn: number };

/** Listings with guests expected in the next week, soonest first. */
export async function listCheckInTargets(): Promise<CheckInTarget[]> {
  return read(() => {
    const w = db();
    const { activations } = mine();
    const now = Date.now();
    return activations
      .filter((a) => a.type !== "professional" && (a.status === "live" || a.status === "paused"))
      .map((a) => {
        const orders = w.orders.filter(
          (o) =>
            o.activationId === a.id &&
            o.status === "paid" &&
            o.scheduledFor &&
            Math.abs(new Date(o.scheduledFor).getTime() - now) < 21 * DAY,
        );
        const soonest =
          orders
            .map((o) => o.scheduledFor ?? "")
            .filter((x) => new Date(x).getTime() > now - DAY)
            .sort()[0] ?? null;
        return { id: a.id, title: a.title, when: soonest, expected: orders.length, checkedIn: orders.filter((o) => o.checkedInAt).length };
      })
      .filter((t) => t.expected > 0)
      .sort((a, b) => (a.when ?? "9").localeCompare(b.when ?? "9"));
  });
}

export async function listCheckInQueue(activationId: string, q = ""): Promise<InboxOrder[]> {
  return read(() => {
    const w = db();
    const { ids } = mine();
    if (!ids.has(activationId)) throw new ApiError("Choose one of your own listings.", "forbidden");
    const now = Date.now();
    const needle = q.trim().toLowerCase();
    const a = w.activations.find((x) => x.id === activationId);
    return w.orders
      .filter(
        (o) =>
          o.activationId === activationId &&
          o.status === "paid" &&
          o.scheduledFor &&
          Math.abs(new Date(o.scheduledFor).getTime() - now) < 21 * DAY,
      )
      .map((o) => ({ ...o, fan: userName(o.userId), title: a?.title ?? "", type: a?.type ?? ("event" as const) }))
      .filter((o) => !needle || o.fan.toLowerCase().includes(needle) || o.code.toLowerCase().includes(needle))
      .sort((x, y) => Number(Boolean(x.checkedInAt)) - Number(Boolean(y.checkedInAt)) || x.fan.localeCompare(y.fan))
      .slice(0, 100);
  });
}

export async function checkInTicket(code: string): Promise<InboxOrder> {
  return write(() => {
    const w = db();
    const { ids } = mine();
    const clean = code.trim().toUpperCase();
    const order = w.orders.find((o) => o.code === clean);
    if (!order) throw new ApiError(`No ticket matches ${clean}. Check the code and scan again.`, "not_found");
    if (!ids.has(order.activationId)) throw new ApiError("This ticket is for another organiser's listing.", "forbidden");
    if (order.status !== "paid") throw new ApiError("This ticket was never paid for. Send the guest to the box office.", "conflict");
    if (order.checkedInAt) throw new ApiError("This ticket was already scanned. Check the guest's ID before letting them in.", "conflict");
    const now = new Date().toISOString();
    patchOrder(order.id, { checkedInAt: now });
    w.interactions.push({ id: uid("int"), activationId: order.activationId, userId: order.userId, kind: "checkin", at: now });
    const a = w.activations.find((x) => x.id === order.activationId);
    return { ...order, fan: userName(order.userId), title: a?.title ?? "", type: a?.type ?? "event" };
  });
}

export type StudioPayouts = {
  balance: number;
  lifetimeGross: number;
  lifetimeCommission: number;
  rows: { orderId: string; code: string; title: string; at: string; gross: number; commission: number; net: number }[];
  history: { id: string; amount: number; phone: string; status: string; at: string }[];
  payoutPhone: string;
};

export async function getStudioPayouts(): Promise<StudioPayouts> {
  return read(() => {
    const w = db();
    const { providers, ids } = mine();
    const orderIds = new Set(w.orders.filter((o) => ids.has(o.activationId) && o.status === "paid").map((o) => o.id));
    const byOrder = new Map<string, { gross: number; net: number; at: string }>();
    for (const l of w.ledger) {
      if (!orderIds.has(l.orderId)) continue;
      const row = byOrder.get(l.orderId) ?? { gross: 0, net: 0, at: l.at };
      row.gross += l.amount;
      if (l.party === "provider" && l.partyId && providers.has(l.partyId)) row.net += l.amount;
      byOrder.set(l.orderId, row);
    }
    const orders = new Map(w.orders.map((o) => [o.id, o]));
    const rows = [...byOrder.entries()]
      .map(([orderId, r]) => {
        const o = orders.get(orderId);
        return {
          orderId,
          code: o?.code ?? "",
          title: w.activations.find((a) => a.id === o?.activationId)?.title ?? "",
          at: r.at,
          gross: r.gross,
          commission: r.gross - r.net,
          net: r.net,
        };
      })
      .sort((a, b) => b.at.localeCompare(a.at));
    const history = w.payouts.filter((p) => p.ownerId === DEMO_IDS.entertainer).sort((a, b) => b.at.localeCompare(a.at));
    const lifetimeNet = sum(rows.map((r) => r.net));
    return {
      balance: lifetimeNet - sum(history.map((h) => h.amount)),
      lifetimeGross: sum(rows.map((r) => r.gross)),
      lifetimeCommission: sum(rows.map((r) => r.commission)),
      rows: rows.slice(0, 50),
      history,
      payoutPhone: w.providers.find((p) => providers.has(p.id))?.payoutPhone ?? "",
    };
  });
}

export async function requestStudioPayout(amount: number, phone: string) {
  return write(() => {
    const w = db();
    const { providers } = mine();
    const net = sum(w.ledger.filter((l) => l.party === "provider" && l.partyId && providers.has(l.partyId)).map((l) => l.amount));
    const paid = sum(w.payouts.filter((p) => p.ownerId === DEMO_IDS.entertainer).map((p) => p.amount));
    if (amount < 10_000) throw new ApiError("Withdraw at least TSh 10,000.");
    if (amount > net - paid) throw new ApiError("That is more than your available balance. Lower the amount.");
    const payout = {
      id: uid("pay"),
      ownerId: DEMO_IDS.entertainer,
      amount,
      phone,
      status: "processing" as const,
      at: new Date().toISOString(),
    };
    w.payouts.push(payout);
    return payout;
  });
}
