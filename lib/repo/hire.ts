import { DEMO_IDS } from "../config";
import { db } from "../mock/db";
import { type HireDetails, HireDetailsSchema, type HireRequest, type Quote, QuoteSchema } from "../schemas";
import { getSession } from "../session";
import { uid } from "../utils";
import { ApiError, read, write } from "./client";
import { myProviderIds, userName } from "./views";

export type HireView = HireRequest & { activationTitle: string; activationSlug: string; fanName: string };

function view(h: HireRequest): HireView {
  const a = db().activations.find((x) => x.id === h.activationId);
  return { ...h, activationTitle: a?.title ?? "Removed listing", activationSlug: a?.slug ?? "", fanName: userName(h.fanId) };
}

export async function createHireRequest(activationId: string, details: HireDetails): Promise<HireView> {
  return write(() => {
    if (!getSession().signedIn) throw new ApiError("Create an account to send a hire request.", "forbidden");
    const parsed = HireDetailsSchema.parse(details);
    const a = db().activations.find((x) => x.id === activationId);
    if (!a?.professional) throw new ApiError("This listing does not take hire requests.", "conflict");
    if (!a.professional.availability.includes(parsed.date)) {
      throw new ApiError("That date is not available. Pick a highlighted date on the calendar.", "validation");
    }
    const now = new Date().toISOString();
    const req: HireRequest = {
      id: uid("hire"),
      fanId: DEMO_IDS.fan,
      activationId,
      details: parsed,
      status: "sent",
      history: [{ status: "sent", at: now }],
      createdAt: now,
    };
    db().hireRequests.unshift(req);
    return view(req);
  });
}

export async function listMyHireRequests(activationId?: string): Promise<HireView[]> {
  return read(() => {
    if (!getSession().signedIn) return [];
    return db()
      .hireRequests.filter((h) => h.fanId === DEMO_IDS.fan && (!activationId || h.activationId === activationId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(view);
  });
}

export async function respondToQuote(id: string, decision: "accept" | "decline"): Promise<HireView> {
  return write(() => {
    const req = db().hireRequests.find((h) => h.id === id && h.fanId === DEMO_IDS.fan);
    if (!req) throw new ApiError("This hire request no longer exists.", "not_found");
    if (req.status !== "quoted" || !req.quote) throw new ApiError("There is no open quote to respond to.", "conflict");
    if (new Date(req.quote.expiresAt).getTime() < Date.now()) {
      throw new ApiError("This quote has expired. Ask the entertainer to send a new one.", "conflict");
    }
    const now = new Date().toISOString();
    req.status = decision === "accept" ? "accepted" : "declined";
    if (decision === "decline") req.declinedBy = "fan";
    req.history.push({ status: req.status, at: now });
    return view(req);
  });
}

/* Entertainer side */

export async function listIncomingHireRequests(): Promise<HireView[]> {
  return read(() => {
    const mine = myProviderIds();
    const myActivationIds = new Set(
      db()
        .activations.filter((a) => mine.has(a.providerId))
        .map((a) => a.id),
    );
    return db()
      .hireRequests.filter((h) => myActivationIds.has(h.activationId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(view);
  });
}

export async function sendQuote(id: string, quote: Quote): Promise<HireView> {
  return write(() => {
    const parsed = QuoteSchema.parse(quote);
    const req = db().hireRequests.find((h) => h.id === id);
    if (!req) throw new ApiError("This hire request no longer exists.", "not_found");
    if (req.status !== "sent" && req.status !== "quoted") throw new ApiError("You can only quote open requests.", "conflict");
    req.quote = { ...parsed, expiresAt: new Date(`${parsed.expiresAt}T23:59:00`).toISOString() };
    req.status = "quoted";
    req.history.push({ status: "quoted", at: new Date().toISOString() });
    return view(req);
  });
}

export async function declineHireRequest(id: string): Promise<HireView> {
  return write(() => {
    const req = db().hireRequests.find((h) => h.id === id);
    if (!req) throw new ApiError("This hire request no longer exists.", "not_found");
    req.status = "declined";
    req.declinedBy = "entertainer";
    req.history.push({ status: "declined", at: new Date().toISOString() });
    return view(req);
  });
}
