"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import * as React from "react";
import { Toaster } from "sonner";
import { network, subscribeToChanges, tickCrowd } from "@/lib/repo";
import { setSession } from "@/lib/session";
import { readPersistedStore, useAppStore } from "@/lib/store";

// Restore the demo session before the first query runs.
if (typeof window !== "undefined") {
  const persisted = readPersistedStore();
  setSession({ signedIn: persisted.signedIn ?? true, referralCode: persisted.referralCode ?? null });
  network.failureRate = persisted.flakyNetwork ? 0.25 : 0;
}

function useStoreBridge() {
  React.useEffect(() => {
    const apply = (s: ReturnType<typeof useAppStore.getState>) => {
      setSession({ signedIn: s.signedIn, referralCode: s.referralCode });
      network.failureRate = s.flakyNetwork ? 0.25 : 0;
    };
    const unsubscribe = useAppStore.subscribe(apply);
    void useAppStore.persist?.rehydrate();

    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) useAppStore.getState().setReferralCode(ref);
    return unsubscribe;
  }, []);
}

/** Every 20–30 seconds, one simulated fan does something. */
function useLiveFeel() {
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (document.visibilityState === "visible") tickCrowd();
          schedule();
        },
        20_000 + Math.random() * 10_000,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
}

function useInvalidateOnChange(client: QueryClient) {
  React.useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToChanges(() => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => void client.invalidateQueries(), 40);
    });
    return () => {
      unsubscribe();
      if (pending) clearTimeout(pending);
    };
  }, [client]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );
  useStoreBridge();
  useLiveFeel();
  useInvalidateOnChange(client);

  return (
    <QueryClientProvider client={client}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border !border-line !bg-raised !text-ink !font-sans !shadow-[0_12px_32px_var(--color-shadow)]",
            description: "!text-muted",
            error: "!border-live/50",
          },
        }}
      />
    </QueryClientProvider>
  );
}
