"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/messages/en";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" role="alert" className="mx-auto flex min-h-[70dvh] max-w-xl flex-col justify-center gap-5 px-5">
      <h1 className="text-2xl font-semibold">{t.states.errorTitle}</h1>
      <p className="text-muted">Something broke on this page. Your data is safe. Try again, or head back home.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t.common.retry}</Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>
          {t.states.goHome}
        </Button>
      </div>
    </main>
  );
}
