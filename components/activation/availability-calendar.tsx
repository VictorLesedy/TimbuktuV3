"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DAYS, DAYS_SHORT, dayIndex } from "@/lib/config";
import { toDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

/**
 * Month grid. In "pick" mode only available dates are selectable; in "toggle"
 * mode (the studio wizard) every future date can be switched on or off.
 */
export function AvailabilityCalendar({
  available,
  selected,
  onSelect,
  mode = "pick",
  monthsAhead = 3,
}: {
  available: string[];
  selected?: string | null;
  onSelect: (key: string) => void;
  mode?: "pick" | "toggle";
  monthsAhead?: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [offset, setOffset] = React.useState(0);
  const month = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const lead = dayIndex(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const set = new Set(available);
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(month);

  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-medium" aria-live="polite">
          {label}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label={t.professional.prevMonth}
            disabled={offset === 0}
            onClick={() => setOffset((o) => o - 1)}
            className="grid size-9 place-items-center rounded-full hover:bg-tint/5 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={t.professional.nextMonth}
            disabled={offset >= monthsAhead}
            onClick={() => setOffset((o) => o + 1)}
            className="grid size-9 place-items-center rounded-full hover:bg-tint/5 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div role="group" aria-label={label} className="grid grid-cols-7 gap-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} aria-hidden="true" className="pb-1 text-center text-xs text-muted">
            {d.slice(0, 2)}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} aria-hidden="true" />;
          const key = toDateKey(date);
          const past = date < today;
          const isAvailable = set.has(key);
          const isSelected = mode === "pick" ? selected === key : isAvailable;
          const disabled = past || (mode === "pick" && !isAvailable);
          const dayName = `${DAYS[dayIndex(date)]} ${date.getDate()} ${new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date)}`;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`${dayName}, ${isAvailable ? t.professional.available : t.professional.unavailable}`}
              onClick={() => onSelect(key)}
              className={cn(
                "grid aspect-square w-full place-items-center rounded-xl text-sm tabular transition-colors disabled:cursor-not-allowed",
                past && "text-muted/35",
                !past && !isAvailable && "text-muted/60",
                !past && isAvailable && !isSelected && "bg-accent/12 text-ink hover:bg-accent/25",
                isSelected && (mode === "pick" ? "bg-accent font-semibold text-on-accent" : "bg-accent/80 font-semibold text-on-accent"),
                mode === "toggle" && !past && !isAvailable && "hover:bg-tint/5",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-accent/25" />
          {t.professional.available}
        </span>
        {mode === "pick" ? (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-accent" />
            {t.professional.selected}
          </span>
        ) : null}
      </div>
    </div>
  );
}
