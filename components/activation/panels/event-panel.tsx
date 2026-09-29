"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { OptionCard, OptionGroup, Stepper } from "@/components/ui/controls";
import { countdownParts, formatDate, formatTime, tsh } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import type { Activation } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";
import { GateCard, PanelTotal, StepLabel, useSelectionGate } from "./shared";

type EventActivation = Activation & { event: NonNullable<Activation["event"]> };

export function EventPanel({ activation }: { activation: EventActivation }) {
  const ev = activation.event;
  const gated = useSelectionGate();
  const router = useRouter();
  const setCart = useAppStore((s) => s.setCart);
  const now = useNow(30_000);
  const firstOpen = ev.tiers.find((tier) => tier.sold < tier.capacity);
  const [tierId, setTierId] = React.useState(firstOpen?.id ?? "");
  const [qty, setQty] = React.useState(1);
  const tier = ev.tiers.find((x) => x.id === tierId);
  const left = tier ? tier.capacity - tier.sold : 0;
  const maxQty = Math.max(1, Math.min(8, left));
  const ended = new Date(ev.endsAt).getTime() < now;
  const cd = countdownParts(ev.startsAt, now);

  React.useEffect(() => {
    if (qty > maxQty) setQty(maxQty);
  }, [qty, maxQty]);

  if (ended) return <p className="text-muted">{t.event.ended}</p>;
  if (gated) return <GateCard />;

  const soldOut = !firstOpen;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm text-ink">
          {formatDate(ev.startsAt)}, {formatTime(ev.startsAt)}
        </p>
        {!cd.done ? (
          <p className="text-sm text-muted tabular">
            {t.event.startsIn} {cd.days ? `${cd.days}d ${cd.hours}h` : `${cd.hours}h ${cd.minutes}m`}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <StepLabel n={1}>{t.event.pickTier}</StepLabel>
        <OptionGroup value={tierId} onValueChange={setTierId} aria-label={t.event.pickTier}>
          {ev.tiers.map((x) => {
            const remaining = x.capacity - x.sold;
            const low = remaining > 0 && remaining <= Math.max(10, x.capacity * 0.1);
            return (
              <OptionCard key={x.id} value={x.id} disabled={remaining <= 0}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{x.name}</span>
                    {x.perks ? <span className="text-sm text-muted">{x.perks}</span> : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium tabular">{tsh(x.price)}</span>
                    <span className={cn("text-xs tabular", low ? "text-live" : "text-muted")}>{t.common.left(remaining)}</span>
                  </div>
                </div>
              </OptionCard>
            );
          })}
        </OptionGroup>
      </div>

      {!soldOut ? (
        <div className="flex items-center justify-between gap-3">
          <StepLabel n={2}>{t.event.quantity}</StepLabel>
          <Stepper value={qty} onChange={setQty} max={maxQty} label={t.event.quantity} />
        </div>
      ) : null}

      <PanelTotal label={t.common.total} amount={tsh((tier?.price ?? 0) * qty)} />

      <Button
        size="lg"
        disabled={soldOut || !tier || left <= 0}
        onClick={() => {
          if (!tier) return;
          setCart({
            activationId: activation.id,
            slug: activation.slug,
            title: activation.title,
            kind: "ticket",
            lines: [{ label: `${tier.name} ticket`, unitPrice: tier.price, qty, tierId: tier.id }],
            scheduledFor: ev.startsAt,
            when: `${formatDate(ev.startsAt)}, ${formatTime(ev.startsAt)}`,
          });
          router.push("/checkout");
        }}
      >
        {soldOut ? t.event.soldOut : t.event.cta}
      </Button>
    </div>
  );
}
