"use client";

import { Repeat, TrendingUp, Users } from "lucide-react";
import { Chip } from "@/components/ui/misc";
import { LiveDot, NumberTicker, Rating } from "@/components/ui/signals";
import { percent } from "@/lib/format";
import type { ActivationCard } from "@/lib/repo";
import { t } from "@/messages/en";
import { RhythmHeatmap } from "./rhythm-heatmap";

export function LivingPanel({ card }: { card: ActivationCard }) {
  const s = card.signals;
  return (
    <section aria-labelledby="living-title" className="flex flex-col gap-6 rounded-card bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="living-title" className="flex items-center gap-2.5 text-lg font-semibold">
          {s.busyNow ? <LiveDot /> : null}
          {s.busyNow ? t.living.busyNow : t.living.title}
        </h2>
        {s.rating ? <Rating value={s.rating} count={s.reviewCount} /> : <span className="text-sm text-muted">{t.living.noRating}</span>}
      </div>

      {card.badges.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Badges">
          {card.badges.map((b) => (
            <li key={b.id}>
              <Chip tone={b.live ? "live" : b.id === "new" ? "accent" : "quiet"}>{b.label}</Chip>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="flex items-center gap-1.5 text-xs text-muted">
            <TrendingUp className="size-3.5" aria-hidden="true" />
            {t.living.momentum}
          </dt>
          <dd className="text-sm text-ink">
            <NumberTicker value={s.saves48h} /> saves, <NumberTicker value={s.sales48h} /> bookings
            <span className="block text-xs text-muted">in the last 48 hours</span>
          </dd>
        </div>
        {s.repeatRate > 0 ? (
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <Repeat className="size-3.5" aria-hidden="true" />
              Regulars
            </dt>
            <dd className="text-sm text-ink">{t.living.repeat(percent(s.repeatRate))}</dd>
          </div>
        ) : null}
        {card.crowdLabel ? (
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <Users className="size-3.5" aria-hidden="true" />
              {t.living.crowd}
            </dt>
            <dd className="text-sm text-ink">{card.crowdLabel}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t.living.rhythmTitle}</h3>
        <RhythmHeatmap rhythm={s.rhythm} />
      </div>
    </section>
  );
}
