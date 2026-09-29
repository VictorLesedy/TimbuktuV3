"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/controls";
import { formatDate, formatTime, toDateKey, tsh } from "@/lib/format";
import type { Activation, Slot } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";
import { DateChip, GateCard, PanelTotal, StepLabel, useSelectionGate } from "./shared";

type ServiceActivation = Activation & { service: NonNullable<Activation["service"]> };
const open = (s: Slot) => s.booked < s.capacity;

export function ServicePanel({ activation }: { activation: ServiceActivation }) {
  const svc = activation.service;
  const gated = useSelectionGate();
  const router = useRouter();
  const setCart = useAppStore((s) => s.setCart);

  const days = React.useMemo(() => {
    const now = Date.now();
    const horizon = now + 14 * 86_400_000;
    const map = new Map<string, Slot[]>();
    for (const s of svc.slots) {
      const at = new Date(s.startsAt).getTime();
      if (at < now || at > horizon) continue;
      const key = toDateKey(new Date(s.startsAt));
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, slots]) => ({ key, slots: [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }));
  }, [svc.slots]);

  const firstDay = days.find((d) => d.slots.some(open));
  const [dayKey, setDayKey] = React.useState(firstDay?.key ?? "");
  const day = days.find((d) => d.key === dayKey);
  const [slotId, setSlotId] = React.useState(firstDay?.slots.find(open)?.id ?? "");
  const slot = day?.slots.find((s) => s.id === slotId);
  const remaining = slot ? slot.capacity - slot.booked : 0;
  const [group, setGroup] = React.useState(1);

  React.useEffect(() => {
    if (group > Math.max(1, remaining)) setGroup(Math.max(1, remaining));
  }, [group, remaining]);

  if (gated) return <GateCard />;
  if (!firstDay) return <p className="text-muted">{t.service.noSlots}</p>;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        {t.detail.duration(svc.durationMins)}, {tsh(svc.pricePerPerson)} {t.common.perPerson}
      </p>
      <div className="flex flex-col gap-3">
        <StepLabel n={1}>{t.service.pickDate}</StepLabel>
        <div role="radiogroup" aria-label={t.service.pickDate} className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const iso = d.slots[0]?.startsAt ?? new Date().toISOString();
            const any = d.slots.some(open);
            return (
              <DateChip
                key={d.key}
                selected={d.key === dayKey}
                disabled={!any}
                onSelect={() => {
                  setDayKey(d.key);
                  setSlotId(d.slots.find(open)?.id ?? "");
                }}
                top={formatDate(iso, { day: undefined, month: undefined })}
                day={new Date(iso).getDate()}
                bottom={any ? (d.slots.length === 1 ? "1 time" : `${d.slots.length} times`) : t.service.full}
              />
            );
          })}
        </div>
      </div>

      {day ? (
        <div className="flex flex-col gap-3">
          <StepLabel n={2}>{t.service.pickSlot}</StepLabel>
          <div role="radiogroup" aria-label={t.service.pickSlot} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {day.slots.map((s) => {
              const left = s.capacity - s.booked;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={s.id === slotId}
                  disabled={left <= 0}
                  onClick={() => setSlotId(s.id)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-40",
                    s.id === slotId ? "border-accent bg-accent/[0.08]" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="font-medium tabular">{formatTime(s.startsAt)}</span>
                  <span className={cn("text-xs", left > 0 && left <= 3 ? "text-live" : "text-muted")}>
                    {left > 0 ? t.common.left(left) : t.service.full}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {slot && remaining > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <StepLabel n={3}>{t.service.groupSize}</StepLabel>
          <Stepper value={group} onChange={setGroup} max={Math.min(remaining, 10)} label={t.service.groupSize} />
        </div>
      ) : null}

      <PanelTotal label={t.common.total} amount={tsh(svc.pricePerPerson * group)} />

      <Button
        size="lg"
        disabled={!slot || remaining <= 0}
        onClick={() => {
          if (!slot) return;
          setCart({
            activationId: activation.id,
            slug: activation.slug,
            title: activation.title,
            kind: "slot",
            lines: [
              { label: `${activation.title}, ${formatTime(slot.startsAt)}`, unitPrice: svc.pricePerPerson, qty: group, slotId: slot.id },
            ],
            scheduledFor: slot.startsAt,
            when: `${formatDate(slot.startsAt)}, ${formatTime(slot.startsAt)}`,
          });
          router.push("/checkout");
        }}
      >
        {t.service.cta}
      </Button>
    </div>
  );
}
