"use client";

import * as React from "react";
import { useAppStore } from "./store";

/** True once the persisted store has loaded from localStorage. */
export function useHydrated() {
  // The persist API only exists in the browser.
  const [hydrated, setHydrated] = React.useState(() => useAppStore.persist?.hasHydrated() ?? false);
  React.useEffect(() => {
    const api = useAppStore.persist;
    if (!api) return;
    if (api.hasHydrated()) setHydrated(true);
    return api.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

/** Re-renders every `ms` milliseconds. Used for countdowns. */
export function useNow(ms = 1000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard can be blocked; the UI still confirms the intent */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, []);
  return { copied, copy };
}
