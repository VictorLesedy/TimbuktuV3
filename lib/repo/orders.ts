import { DEMO_IDS, PROMO_CODES } from "../config";
import { splitOrder } from "../ledger";
import { db, patchOrder } from "../mock/db";
import type { Interaction, Order, OrderKind, OrderLine } from "../schemas";
import { getSession } from "../session";
import { uid } from "../utils";
import { ApiError, read, write } from "./client";

export type CheckoutInput = {
  activationId: string;
  kind: OrderKind;
  lines: OrderLine[];
  scheduledFor?: string;
  hireRequestId?: string;
  promoCode?: string;
  phone: string;
  network: string;
};

export type PaymentOutcome = "success" | "failure";

export async function validatePromo(code: string) {
  return read(() => {
    const rate = PROMO_CODES[code.trim().toUpperCase()];
    if (rate === undefined) throw new ApiError(`"${code}" is not an active promo code. Check the spelling or remove it.`);
    return { code: code.trim().toUpperCase(), rate };
  });
}

function priceLines(input: CheckoutInput) {
  const w = db();
  const a = w.activations.find((x) => x.id === input.activationId);
  if (a?.status !== "live") throw new ApiError("This listing is no longer taking bookings.", "not_found");

  const lines: OrderLine[] = input.lines.map((line) => {
    if (line.tierId && a.event) {
      const tier = a.event.tiers.find((t) => t.id === line.tierId);
      if (!tier) throw new ApiError("That ticket tier no longer exists.", "conflict");
      if (tier.sold + line.qty > tier.capacity) {
        const left = tier.capacity - tier.sold;
        throw new ApiError(
          left > 0
            ? `Only ${left} ${tier.name} tickets are left. Lower the quantity and try again.`
            : `${tier.name} just sold out. Pick another tier.`,
          "conflict",
        );
      }
      return { ...line, unitPrice: tier.price, label: `${tier.name} ticket` };
    }
    if (line.tableId && a.venue) {
      const option = a.venue.tableOptions.find((t) => t.id === line.tableId);
      if (!option) throw new ApiError("That table option is no longer offered.", "conflict");
      return { ...line, unitPrice: option.deposit, label: `${option.name} deposit` };
    }
    if (line.slotId && a.service) {
      const slot = a.service.slots.find((s) => s.id === line.slotId);
      if (!slot) throw new ApiError("That time slot is no longer offered.", "conflict");
      if (slot.booked + line.qty > slot.capacity) {
        throw new ApiError(
          `Only ${slot.capacity - slot.booked} places are left in this slot. Reduce your group size or pick another slot.`,
          "conflict",
        );
      }
      return { ...line, unitPrice: a.service.pricePerPerson };
    }
    if (input.hireRequestId) {
      const req = w.hireRequests.find((h) => h.id === input.hireRequestId);
      if (!req?.quote || req.status !== "accepted") throw new ApiError("Accept the quote before paying.", "conflict");
      return { ...line, unitPrice: req.quote.price, qty: 1 };
    }
    return line;
  });
  return { a, lines };
}

export async function createOrder(input: CheckoutInput): Promise<Order> {
  return write(() => {
    if (!getSession().signedIn) throw new ApiError("Create an account to finish checking out.", "forbidden");
    const { lines } = priceLines(input);
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const rate = input.promoCode ? (PROMO_CODES[input.promoCode] ?? 0) : 0;
    const discount = Math.round((subtotal * rate) / 100) * 100;
    const w = db();
    const referrer = getSession().referralCode
      ? w.users.find((u) => u.referralCode === getSession().referralCode && u.id !== DEMO_IDS.fan)
      : undefined;
    const order: Order = {
      id: uid("ord"),
      code: `TBK-${Math.floor(100000 + Math.random() * 900000)}`,
      userId: DEMO_IDS.fan,
      activationId: input.activationId,
      kind: input.kind,
      lines,
      promoCode: rate ? input.promoCode : undefined,
      discount,
      total: subtotal - discount,
      status: "pending",
      createdAt: new Date().toISOString(),
      scheduledFor: input.scheduledFor,
      hireRequestId: input.hireRequestId,
      referrerId: referrer?.fanLevel === "ambassador" ? referrer.id : undefined,
      phone: input.phone,
      network: input.network,
    };
    w.orders.push(order);
    return order;
  });
}

/** The mobile-money provider calls back. Success applies inventory, signals and the ledger. */
export async function confirmPayment(orderId: string, outcome: PaymentOutcome): Promise<Order> {
  return write(() => {
    const w = db();
    const order = w.orders.find((o) => o.id === orderId);
    if (!order) throw new ApiError("We could not find this order. Start checkout again.", "not_found");
    if (order.status !== "pending") return order;
    if (outcome === "failure") {
      patchOrder(order.id, { status: "failed" });
      return order;
    }
    const a = w.activations.find((x) => x.id === order.activationId);
    if (!a) throw new ApiError("This listing is no longer available.", "not_found");

    // Inventory is re-checked at payment time; another fan may have bought the last ticket.
    for (const line of order.lines) {
      if (line.tierId && a.event) {
        const tier = a.event.tiers.find((t) => t.id === line.tierId);
        if (!tier || tier.sold + line.qty > tier.capacity) {
          patchOrder(order.id, { status: "failed" });
          throw new ApiError("Those tickets sold out while you were paying. You have not been charged.", "conflict");
        }
      }
    }
    for (const line of order.lines) {
      const tier = line.tierId ? a.event?.tiers.find((t) => t.id === line.tierId) : undefined;
      if (tier) tier.sold += line.qty;
      const slot = line.slotId ? a.service?.slots.find((s) => s.id === line.slotId) : undefined;
      if (slot) slot.booked += line.qty;
    }

    const now = new Date().toISOString();
    patchOrder(order.id, { status: "paid", createdAt: now });
    const kind: Interaction["kind"] = order.kind === "ticket" ? "purchase" : "booking";
    const firstLine = order.lines[0];
    let tier: Interaction["tier"] = "general";
    if (firstLine?.tierId && firstLine.tierId !== "early") tier = "vip";
    if (firstLine?.tableId === "table") tier = "table";
    if (firstLine?.tableId === "vip") tier = "vip";
    w.interactions.push({ id: uid("int"), activationId: a.id, userId: order.userId, kind, amount: order.total, tier, at: now });
    if (order.referrerId) {
      w.interactions.push({
        id: uid("int"),
        activationId: a.id,
        userId: order.referrerId,
        kind: "referral_sale",
        amount: order.total,
        at: now,
      });
    }
    w.ledger.push(...splitOrder(order, a, w.settings, uid));

    if (order.hireRequestId) {
      const req = w.hireRequests.find((h) => h.id === order.hireRequestId);
      if (req) {
        req.status = "paid";
        req.history.push({ status: "paid", at: now });
      }
    }
    return order;
  });
}

export async function expireOrder(orderId: string): Promise<Order> {
  return write(() => {
    const order = db().orders.find((o) => o.id === orderId);
    if (!order) throw new ApiError("We could not find this order.", "not_found");
    if (order.status === "pending") patchOrder(order.id, { status: "expired" });
    return order;
  });
}

export type MyOrder = Order & {
  activation: { title: string; slug: string; type: string; media: { url: string; alt: string; hue: number }[]; area: string; city: string };
};

export async function listMyOrders(): Promise<MyOrder[]> {
  return read(() => {
    if (!getSession().signedIn) return [];
    const w = db();
    return w.orders
      .filter((o) => o.userId === DEMO_IDS.fan && o.status === "paid")
      .map((o) => {
        const a = w.activations.find((x) => x.id === o.activationId);
        return {
          ...o,
          activation: {
            title: a?.title ?? "Removed listing",
            slug: a?.slug ?? "",
            type: a?.type ?? "event",
            media: a?.media ?? [],
            area: a?.location.area ?? "",
            city: a?.city ?? "",
          },
        };
      })
      .sort((x, y) => (y.scheduledFor ?? y.createdAt).localeCompare(x.scheduledFor ?? x.createdAt));
  });
}
