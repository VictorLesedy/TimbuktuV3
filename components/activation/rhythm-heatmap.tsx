"use client";

import * as React from "react";
import { BANDS, DAYS, DAYS_SHORT, nightDayIndex } from "@/lib/config";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

/**
 * Day × time-band heatmap. Keyboard: Tab into the grid, arrow keys to move.
 * The readout below announces the focused cell.
 */
export function RhythmHeatmap({ rhythm, className, compact = false }: { rhythm: number[][]; className?: string; compact?: boolean }) {
  const today = nightDayIndex(new Date());
  const [active, setActive] = React.useState<[number, number] | null>(null);
  const [focus, setFocus] = React.useState<[number, number]>(() => {
    const row = rhythm[today] ?? [];
    const band = row.indexOf(Math.max(...row));
    return [today, band < 0 ? 2 : band];
  });
  const cells = React.useRef(new Map<string, HTMLTableCellElement>());
  const empty = rhythm.every((row) => row.every((v) => v === 0));

  if (empty) {
    return (
      <p className={cn("rounded-2xl border border-dashed border-line-strong p-5 text-sm text-muted", className)}>{t.living.rhythmEmpty}</p>
    );
  }

  function move(e: React.KeyboardEvent, day: number, band: number) {
    const delta: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    const next: [number, number] = [(day + d[0] + 7) % 7, (band + d[1] + 4) % 4];
    setFocus(next);
    setActive(next);
    cells.current.get(`${next[0]}-${next[1]}`)?.focus();
  }

  const shown = active ?? null;
  const shownValue = shown ? (rhythm[shown[0]]?.[shown[1]] ?? 0) : 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <table className="w-full table-fixed border-separate border-spacing-1" onMouseLeave={() => setActive(null)}>
        <caption className="sr-only">{t.living.rhythmTitle}</caption>
        <thead>
          <tr>
            <th scope="col" className={cn(compact ? "w-16" : "w-24")}>
              <span className="sr-only">Time</span>
            </th>
            {DAYS_SHORT.map((d, i) => (
              <th key={d} scope="col" className={cn("pb-1 text-center text-xs font-medium", i === today ? "text-accent" : "text-muted")}>
                <abbr title={DAYS[i]} className="no-underline">
                  {compact ? d.slice(0, 1) : d}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BANDS.map((band, b) => (
            <tr key={band.id}>
              <th scope="row" className="pr-2 text-left text-xs font-normal whitespace-nowrap text-muted">
                {compact ? band.label.replace("After midnight", "Late late") : band.label}
              </th>
              {DAYS.map((day, d) => {
                const v = rhythm[d]?.[b] ?? 0;
                const pct = Math.round(v * 100);
                const isFocus = focus[0] === d && focus[1] === b;
                return (
                  <td
                    key={day}
                    ref={(el) => {
                      if (el) cells.current.set(`${d}-${b}`, el);
                    }}
                    tabIndex={isFocus ? 0 : -1}
                    aria-label={t.living.cellLabel(day, band.label, pct)}
                    onKeyDown={(e) => move(e, d, b)}
                    onFocus={() => setActive([d, b])}
                    onMouseEnter={() => setActive([d, b])}
                    className={cn(
                      "h-8 rounded-md transition-[outline-color] md:h-9",
                      d === today && "ring-1 ring-accent/30 ring-inset",
                      shown && shown[0] === d && shown[1] === b && "outline-2 outline-ink",
                    )}
                    style={{
                      backgroundColor:
                        v < 0.04
                          ? "color-mix(in oklab, var(--color-muted) 12%, transparent)"
                          : `color-mix(in oklab, var(--color-accent) ${Math.round((0.12 + v * 0.88) * 100)}%, transparent)`,
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex min-h-5 items-center justify-between gap-4 text-xs text-muted" aria-live="polite">
        <span>
          {shown ? (
            <>
              <span className="text-ink">
                {DAYS[shown[0]]}, {BANDS[shown[1]]?.label.toLowerCase()}
              </span>{" "}
              ({BANDS[shown[1]]?.range}): {Math.round(shownValue * 100)}% of peak
            </>
          ) : (
            t.living.rhythmHint
          )}
        </span>
        <span aria-hidden="true" className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {t.living.quiet}
          <span className="h-2 w-16 rounded-full bg-[linear-gradient(90deg,color-mix(in_oklab,var(--color-accent)_12%,transparent),var(--color-accent))]" />
          {t.living.peak}
        </span>
      </div>
    </div>
  );
}
