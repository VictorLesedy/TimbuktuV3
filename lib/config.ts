import type { ActivationType, City, Settings } from "./schemas";

export const CITIES: readonly City[] = ["Dar es Salaam", "Arusha", "Zanzibar", "Dodoma"];

export const CITY_CENTER: Record<City, { lat: number; lng: number }> = {
  "Dar es Salaam": { lat: -6.7924, lng: 39.2083 },
  Arusha: { lat: -3.3869, lng: 36.683 },
  Zanzibar: { lat: -6.1659, lng: 39.2026 },
  Dodoma: { lat: -6.163, lng: 35.7516 },
};

/** Monday-first, matching rhythm[day][band]. */
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Time bands, in the order a night unfolds. Hours are local (EAT). */
export const BANDS = [
  { id: "day", label: "Day", range: "10:00–17:00" },
  { id: "evening", label: "Evening", range: "17:00–21:00" },
  { id: "late", label: "Late", range: "21:00–00:00" },
  { id: "after_midnight", label: "After midnight", range: "00:00–05:00" },
] as const;

export function bandOfHour(hour: number): number {
  if (hour < 5) return 3;
  if (hour < 17) return 0;
  if (hour < 21) return 1;
  return 2;
}

/** Monday-first day index. A night that runs past midnight belongs to the day it started. */
export function nightDayIndex(d: Date): number {
  const shifted = new Date(d.getTime() - 5 * 3600_000);
  return (shifted.getDay() + 6) % 7;
}

export function dayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export const TYPE_LABEL: Record<ActivationType, { one: string; many: string }> = {
  event: { one: "Event", many: "Events" },
  venue: { one: "Venue", many: "Venues" },
  service: { one: "Service", many: "Services" },
  professional: { one: "Professional", many: "Professionals" },
};

export const MOBILE_NETWORKS = ["M-Pesa", "Mixx by Yas", "Airtel Money", "HaloPesa"] as const;

export const PROMO_CODES: Record<string, number> = { KARIBU10: 0.1, USIKU20: 0.2 };

export const DEFAULT_SETTINGS: Settings = {
  commission: { event: 0.1, venue: 0.08, service: 0.12, professional: 0.15 },
  governmentShare: 0.2,
  partnerShare: 0.15,
  ambassadorRate: 0.05,
  crowdLabels: { enabled: true, threshold: 30 },
  registrationGate: "atCheckout",
};

/** What a member needs to do to unlock the ambassador level. */
export const AMBASSADOR_REQUIREMENTS = { attended: 3, reviews: 2, shares: 5 } as const;

export const DEMO_IDS = {
  fan: "u_me",
  entertainer: "u_ent",
  admin: "u_admin",
} as const;

export const CHECKOUT_TIMEOUT_SECONDS = 60;

export const PRICE_CEILING = 1_000_000;
