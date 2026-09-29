import { db } from "../mock/db";
import { type ActivationType, type City, type Settings, SettingsSchema } from "../schemas";
import { sum } from "../utils";
import { ApiError, read, write } from "./client";
import { type ActivationCard, toCard, userName } from "./views";

const DAY = 86_400_000;

export type AdminTotals = {
  gross30: number;
  commission30: number;
  liveActivations: number;
  pendingApprovals: number;
  byType: { type: ActivationType; gross: number }[];
  daily: { day: string; gross: number; commission: number }[];
};

export async function getAdminTotals(): Promise<AdminTotals> {
  return read(() => {
    const w = db();
    const now = Date.now();
    const recent = w.ledger.filter((l) => now - new Date(l.at).getTime() <= 30 * DAY);
    const commission = sum(recent.filter((l) => l.party !== "provider").map((l) => l.amount));
    const byType = (["event", "venue", "service", "professional"] as const).map((type) => ({
      type,
      gross: sum(recent.filter((l) => l.activationType === type).map((l) => l.amount)),
    }));
    const daily = Array.from({ length: 30 }, (_, idx) => {
      const d = new Date(now - (29 - idx) * DAY);
      d.setHours(0, 0, 0, 0);
      return {
        start: d.getTime(),
        day: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d),
        gross: 0,
        commission: 0,
      };
    });
    for (const l of recent) {
      const t = new Date(l.at).getTime();
      const bucket = daily.findLast((b) => b.start <= t);
      if (!bucket) continue;
      bucket.gross += l.amount;
      if (l.party !== "provider") bucket.commission += l.amount;
    }
    return {
      gross30: sum(recent.map((l) => l.amount)),
      commission30: commission,
      liveActivations: w.activations.filter((a) => a.status === "live").length,
      pendingApprovals:
        w.activations.filter((a) => a.status === "pending").length + w.providers.filter((p) => p.reviewState === "pending").length,
      byType,
      daily: daily.map(({ day, gross, commission: c }) => ({ day, gross, commission: c })),
    };
  });
}

export type ApprovalItem =
  | { kind: "activation"; id: string; title: string; subtitle: string; submittedAt: string; card: ActivationCard }
  | { kind: "provider"; id: string; title: string; subtitle: string; submittedAt: string; owner: string };

export async function listApprovals(): Promise<ApprovalItem[]> {
  return read(() => {
    const w = db();
    const providers: ApprovalItem[] = w.providers
      .filter((p) => p.reviewState === "pending")
      .map((p) => ({
        kind: "provider",
        id: p.id,
        title: p.name,
        subtitle: `New ${p.category} profile in ${p.city}`,
        submittedAt: p.createdAt,
        owner: userName(p.userId),
      }));
    const activations: ApprovalItem[] = w.activations
      .filter((a) => a.status === "pending")
      .map((a) => {
        const card = toCard(a);
        return {
          kind: "activation",
          id: a.id,
          title: a.title,
          subtitle: `${card.provider.name}, ${a.city}`,
          submittedAt: a.createdAt,
          card,
        };
      });
    return [...providers, ...activations].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  });
}

export type Decision = "approve" | "reject" | "request_changes";

export async function decideApproval(kind: "activation" | "provider", id: string, decision: Decision, note?: string) {
  return write(() => {
    const w = db();
    if (decision !== "approve" && !note?.trim()) throw new ApiError("Add a note so the entertainer knows what to fix.");
    if (kind === "provider") {
      const p = w.providers.find((x) => x.id === id);
      if (!p) throw new ApiError("This profile no longer exists.", "not_found");
      p.reviewState = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "changes_requested";
      p.verified = decision === "approve";
      return { id, decision };
    }
    const a = w.activations.find((x) => x.id === id);
    if (!a) throw new ApiError("This listing no longer exists.", "not_found");
    const provider = w.providers.find((p) => p.id === a.providerId);
    if (decision === "approve" && provider && !provider.verified) {
      throw new ApiError(`Verify ${provider.name} before approving their listings.`, "conflict");
    }
    a.status = decision === "approve" ? "live" : decision === "reject" ? "rejected" : "changes_requested";
    a.moderationNote = note?.trim() || undefined;
    if (decision === "approve") a.createdAt = new Date().toISOString();
    return { id, decision };
  });
}

export async function listAdminActivations(q: string): Promise<ActivationCard[]> {
  return read(() => {
    const needle = q.trim().toLowerCase();
    return db()
      .activations.filter((a) => a.status !== "draft")
      .map((a) => toCard(a, { ownerView: true }))
      .filter((c) => !needle || `${c.activation.title} ${c.provider.name} ${c.activation.city}`.toLowerCase().includes(needle))
      .sort(
        (a, b) => Number(b.activation.featured) - Number(a.activation.featured) || a.activation.title.localeCompare(b.activation.title),
      );
  });
}

export async function setFeatured(id: string, featured: boolean) {
  return write(() => {
    const a = db().activations.find((x) => x.id === id);
    if (!a) throw new ApiError("This listing no longer exists.", "not_found");
    a.featured = featured;
    return a;
  });
}

export async function adminSetPaused(id: string, paused: boolean) {
  return write(() => {
    const a = db().activations.find((x) => x.id === id);
    if (!a) throw new ApiError("This listing no longer exists.", "not_found");
    if (paused && a.status !== "live") throw new ApiError("Only live listings can be paused.", "conflict");
    if (!paused && a.status !== "paused") throw new ApiError("Only paused listings can be resumed.", "conflict");
    a.status = paused ? "paused" : "live";
    return a;
  });
}

export type RevenueRow = {
  orderId: string;
  code: string;
  at: string;
  title: string;
  city: City;
  type: ActivationType;
  gross: number;
  provider: number;
  platform: number;
  government: number;
  partner: number;
  ambassador: number;
};

export type RevenueReport = {
  totals: { gross: number; provider: number; platform: number; government: number; partner: number; ambassador: number };
  rows: RevenueRow[];
};

export async function getRevenueReport(filters: { days: number; city: City | null }): Promise<RevenueReport> {
  return read(() => {
    const w = db();
    const now = Date.now();
    const orders = new Map(w.orders.map((o) => [o.id, o]));
    const titles = new Map(w.activations.map((a) => [a.id, a.title]));
    const rows = new Map<string, RevenueRow>();
    for (const l of w.ledger) {
      if (now - new Date(l.at).getTime() > filters.days * DAY) continue;
      if (filters.city && l.city !== filters.city) continue;
      let row = rows.get(l.orderId);
      if (!row) {
        const o = orders.get(l.orderId);
        row = {
          orderId: l.orderId,
          code: o?.code ?? l.orderId,
          at: l.at,
          title: titles.get(o?.activationId ?? "") ?? "",
          city: l.city,
          type: l.activationType,
          gross: 0,
          provider: 0,
          platform: 0,
          government: 0,
          partner: 0,
          ambassador: 0,
        };
        rows.set(l.orderId, row);
      }
      row[l.party] += l.amount;
      row.gross += l.amount;
    }
    const list = [...rows.values()].sort((a, b) => b.at.localeCompare(a.at));
    const pick = (k: keyof RevenueReport["totals"]) => sum(list.map((r) => r[k]));
    return {
      totals: {
        gross: pick("gross"),
        provider: pick("provider"),
        platform: pick("platform"),
        government: pick("government"),
        partner: pick("partner"),
        ambassador: pick("ambassador"),
      },
      rows: list,
    };
  });
}

export async function getSettings(): Promise<Settings> {
  return read(() => db().settings);
}

export async function updateSettings(next: Settings): Promise<Settings> {
  return write(() => {
    const parsed = SettingsSchema.parse(next);
    if (parsed.governmentShare + parsed.partnerShare > 0.9) {
      throw new ApiError("Government and partner shares together must stay under 90% of commission.");
    }
    db().settings = parsed;
    return parsed;
  });
}

/** Settings are read synchronously by a few client guards (registration gate). */
export function peekSettings(): Settings {
  return structuredClone(db().settings);
}
