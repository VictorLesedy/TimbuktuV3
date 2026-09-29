import type { Activation, LedgerEntry, Order, Settings } from "./schemas";

/**
 * Splits one paid order into ledger entries. Every shilling of the order total
 * lands with exactly one party, so the revenue report always reconciles.
 *
 * gross -> provider (gross - commission) + commission
 * commission -> government + partner + ambassador (if referred) + platform (remainder)
 */
export function splitOrder(
  order: Pick<Order, "id" | "total" | "createdAt" | "referrerId">,
  activation: Pick<Activation, "type" | "city" | "providerId">,
  settings: Settings,
  makeId: (prefix: string) => string,
): LedgerEntry[] {
  const gross = order.total;
  const rate = settings.commission[activation.type] ?? 0.1;
  const commission = Math.round(gross * rate);
  const government = Math.round(commission * settings.governmentShare);
  const partner = Math.round(commission * settings.partnerShare);
  const ambassador = order.referrerId ? Math.min(Math.round(gross * settings.ambassadorRate), commission - government - partner) : 0;
  const platform = commission - government - partner - ambassador;
  const provider = gross - commission;

  const base = { orderId: order.id, at: order.createdAt, city: activation.city, activationType: activation.type };
  const entries: LedgerEntry[] = [
    { id: makeId("led"), party: "provider", amount: provider, partyId: activation.providerId, ...base },
    { id: makeId("led"), party: "platform", amount: platform, ...base },
    { id: makeId("led"), party: "government", amount: government, ...base },
    { id: makeId("led"), party: "partner", amount: partner, ...base },
  ];
  if (ambassador > 0) {
    entries.push({ id: makeId("led"), party: "ambassador", amount: ambassador, partyId: order.referrerId, ...base });
  }
  return entries;
}
