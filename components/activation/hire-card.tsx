"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/misc";
import { formatDate, formatDateTime, tsh } from "@/lib/format";
import { errorMessage, useRespondToQuote } from "@/lib/queries";
import type { HireView } from "@/lib/repo";
import type { HireStatus } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

const FLOW: HireStatus[] = ["sent", "quoted", "accepted", "paid"];

export function HireTimeline({ hire }: { hire: HireView }) {
  const reached = new Map(hire.history.map((h) => [h.status, h.at]));
  const steps: HireStatus[] = hire.status === "declined" ? [...FLOW.filter((s) => reached.has(s)), "declined"] : FLOW;
  return (
    <ol className="flex flex-col gap-0">
      {steps.map((s, i) => {
        const at = reached.get(s);
        const done = Boolean(at);
        const last = i === steps.length - 1;
        return (
          <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
            {!last ? (
              <span
                aria-hidden="true"
                className={cn("absolute top-5 left-[9px] h-[calc(100%-12px)] w-px", done ? "bg-accent/60" : "bg-line-strong")}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full border",
                done ? (s === "declined" ? "border-live bg-live/20" : "border-accent bg-accent text-on-accent") : "border-line-strong",
              )}
            >
              {done && s !== "declined" ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3">
              <span className={cn("text-sm", done ? "text-ink" : "text-muted")}>{t.professional.timeline[s]}</span>
              {at ? <span className="text-xs text-muted">{formatDateTime(at)}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function HireCard({ hire, showListing = false }: { hire: HireView; showListing?: boolean }) {
  const respond = useRespondToQuote();
  const setCart = useAppStore((s) => s.setCart);
  const router = useRouter();
  const expired = hire.quote ? new Date(hire.quote.expiresAt).getTime() < Date.now() : false;

  async function decide(decision: "accept" | "decline") {
    try {
      await respond.mutateAsync({ id: hire.id, decision });
      toast.success(decision === "accept" ? t.professional.accepted : t.professional.declined);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function pay() {
    if (!hire.quote) return;
    setCart({
      activationId: hire.activationId,
      slug: hire.activationSlug,
      title: hire.activationTitle,
      kind: "hire",
      lines: [{ label: `Booking on ${formatDate(hire.details.date)}`, unitPrice: hire.quote.price, qty: 1 }],
      hireRequestId: hire.id,
      scheduledFor: new Date(`${hire.details.date}T20:00:00`).toISOString(),
      when: formatDate(new Date(`${hire.details.date}T20:00:00`).toISOString()),
    });
    router.push("/checkout");
  }

  return (
    <article className="flex flex-col gap-5 rounded-card bg-surface p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          {showListing ? (
            <Link href={`/a/${hire.activationSlug}`} className="font-semibold hover:underline">
              {hire.activationTitle}
            </Link>
          ) : null}
          <p className="text-sm text-muted">
            {formatDate(new Date(`${hire.details.date}T12:00:00`).toISOString(), { year: "numeric" })}, {hire.details.location},{" "}
            {hire.details.durationHours} hours
          </p>
          <p className="text-sm text-muted">Your budget {tsh(hire.details.budget)}</p>
        </div>
        <Chip tone={hire.status === "declined" ? "quiet" : hire.status === "quoted" ? "accent" : "default"}>
          {t.professional.timeline[hire.status]}
        </Chip>
      </header>

      <HireTimeline hire={hire} />

      {hire.quote && hire.status !== "sent" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted">{t.professional.quoteTitle}</span>
            <span className="font-display text-2xl tabular">{tsh(hire.quote.price)}</span>
          </div>
          <p className="text-sm text-ink">{hire.quote.terms}</p>
          {hire.status === "quoted" ? (
            <p className={cn("text-xs", expired ? "text-live" : "text-muted")}>
              {t.professional.quoteExpires(formatDateTime(hire.quote.expiresAt))}
            </p>
          ) : null}
        </div>
      ) : null}

      {hire.status === "sent" ? <p className="text-sm text-muted">{t.professional.waiting}</p> : null}
      {hire.status === "quoted" ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => decide("accept")} disabled={respond.isPending || expired}>
            {t.professional.accept}
          </Button>
          <Button variant="outline" onClick={() => decide("decline")} disabled={respond.isPending}>
            {t.professional.decline}
          </Button>
        </div>
      ) : null}
      {hire.status === "accepted" ? <Button onClick={pay}>{t.professional.pay}</Button> : null}
      {hire.status === "paid" ? <p className="text-sm text-ink">{t.professional.paidNote}</p> : null}
      {hire.status === "declined" ? (
        <p className="text-sm text-muted">{hire.declinedBy === "fan" ? t.professional.declinedByYou : t.professional.declinedByThem}</p>
      ) : null}
    </article>
  );
}
