"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { City, OrderKind, OrderLine, Role } from "./schemas";

export type CartItem = {
  activationId: string;
  slug: string;
  title: string;
  kind: OrderKind;
  lines: OrderLine[];
  scheduledFor?: string;
  hireRequestId?: string;
  /** Human summary, such as "Sat 20 Sep, 18:00". */
  when?: string;
};

type AppState = {
  role: Role;
  city: City;
  signedIn: boolean;
  flakyNetwork: boolean;
  referralCode: string | null;
  cart: CartItem | null;
  setRole: (role: Role) => void;
  setCity: (city: City) => void;
  setSignedIn: (signedIn: boolean) => void;
  setFlakyNetwork: (flaky: boolean) => void;
  setReferralCode: (code: string | null) => void;
  setCart: (cart: CartItem) => void;
  clearCart: () => void;
};

export const STORE_KEY = "timbuktu-ui";

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: "fan",
      city: "Dar es Salaam",
      signedIn: true,
      flakyNetwork: false,
      referralCode: null,
      cart: null,
      setRole: (role) => set({ role }),
      setCity: (city) => set({ city }),
      setSignedIn: (signedIn) => set({ signedIn }),
      setFlakyNetwork: (flakyNetwork) => set({ flakyNetwork }),
      setReferralCode: (referralCode) => set({ referralCode }),
      setCart: (cart) => set({ cart }),
      clearCart: () => set({ cart: null }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** Reads the persisted slice synchronously, before React hydrates. */
export function readPersistedStore(): Partial<AppState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? ((JSON.parse(raw) as { state?: Partial<AppState> }).state ?? {}) : {};
  } catch {
    return {};
  }
}
