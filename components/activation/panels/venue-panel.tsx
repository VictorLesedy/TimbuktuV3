"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { OptionCard, OptionGroup } from "@/components/ui/controls";
import { dayIndex } from "@/lib/config";
import { formatDate, toDateKey, tsh } from "@/lib/format";
import type { Activation, Signals } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { t } from "@/messages/en";
import { DateChip, GateCard, PanelTotal, StepLabel, useSelectionGate } from "./shared";

type VenueActivation = Activation & { venue: NonNullable<Activation["venue"]> };

export function VenuePanel({ activation, signals }: { activation: VenueActivation; signals: Signals }) {
  const venue = activation.venue;
  const gated = useSelectionGate();
  const router = useRouter();
  const setCart = useAppStore((s) => s.setCart);

  // Arrival time comes from the opening hours, e.g. "10:00 until 22:00".
  const [openH, openM] = (venue.hours.match(/(\d{1,2}):(\d{2})/)?.slice(1) ?? ["18", "00"]).map(Number);
  const opensAt = `${String(openH).padStart(2, "0")}:${String(openM).padStart(2, "0")}`;

  const nights = React.useMemo(() => {
    const base = new Date();
    base.setHours(openH ?? 18, openM ?? 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(base.getTime() + i * 86_400_000);
      const di = dayIndex(date);
      const row = signals.rhythm[di] ?? [0, 0, 0, 0];
      return {
        key: toDateKey(date),
        date,
        open: venue.openDays.includes(di),
        busy: Math.round(Math.max(...row) * 100),
      };
    });
  }, [signals.rhythm, venue.openDays, openH, openM]);

  const [night, setNight] = React.useState(() => nights.find((n) => n.open)?.key ?? "");
  const [optionId, setOptionId] = React.useState(venue.tableOptions[0]?.id ?? "");
  const option = venue.tableOptions.find((o) => o.id === optionId);
  const chosen = nights.find((n) => n.key === night);

  if (gated) return <GateCard />;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        {t.detail.hours}: <span className="text-ink">{venue.hours}</span>
      </p>
      <div className="flex flex-col gap-3">
        <StepLabel n={1}>{t.venue.pickDate}</StepLabel>
        <div role="radiogroup" aria-label={t.venue.pickDate} className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {nights.map((n) => (
            <DateChip
              key={n.key}
              selected={n.key === night}
              disabled={!n.open}
              onSelect={() => setNight(n.key)}
              top={formatDate(n.date.toISOString(), { day: undefined, month: undefined })}
              day={n.date.getDate()}
              bottom={n.open ? t.venue.busyness(n.busy) : t.venue.closed}
              busy={n.open ? n.busy : undefined}
              hot={n.open && n.busy >= 70}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <StepLabel n={2}>{t.venue.pickOption}</StepLabel>
        <OptionGroup value={optionId} onValueChange={setOptionId} aria-label={t.venue.pickOption}>
          {venue.tableOptions.map((o) => (
            <OptionCard key={o.id} value={o.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{o.name}</span>
                  <span className="text-sm text-muted">
                    {t.venue.seats(o.seats)}. {t.venue.minSpend(o.minSpend)}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-medium tabular">{o.deposit ? t.venue.deposit(o.deposit) : "No deposit"}</span>
              </div>
            </OptionCard>
          ))}
        </OptionGroup>
      </div>

      <PanelTotal label="Due now" amount={tsh(option?.deposit ?? 0)} note={option?.deposit ? t.venue.depositNote : undefined} />

      <Button
        size="lg"
        disabled={!option || !chosen?.open}
        onClick={() => {
          if (!option || !chosen) return;
          setCart({
            activationId: activation.id,
            slug: activation.slug,
            title: activation.title,
            kind: "reservation",
            lines: [{ label: `${option.name} deposit`, unitPrice: option.deposit, qty: 1, tableId: option.id }],
            scheduledFor: chosen.date.toISOString(),
            when: `${formatDate(chosen.date.toISOString())}, from ${opensAt}`,
          });
          router.push("/checkout");
        }}
      >
        {option?.kind === "entry" ? t.venue.ctaEntry : `${t.venue.cta} ${option?.name.toLowerCase() ?? ""}`.trim()}
      </Button>
    </div>
  );
}
