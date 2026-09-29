"use client";

import { ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { RhythmHeatmap } from "@/components/activation/rhythm-heatmap";
import { ShareBars, TrendChart } from "@/components/charts/charts";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/field";
import { Card, Chip, Skeleton, Stat } from "@/components/ui/misc";
import { LiveDot, NumberTicker, Rating } from "@/components/ui/signals";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDateTime, percent, relativeTime, tsh } from "@/lib/format";
import { useStudioOverview } from "@/lib/queries";
import { t } from "@/messages/en";

const tshTicker = (n: number) => tsh(n);

export function StudioOverview() {
  const q = useStudioOverview();
  const [selected, setSelected] = React.useState<string>("");

  if (q.isPending) {
    return (
      <>
        <PageTitle title={t.studio.title} />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="mt-6 h-80" />
      </>
    );
  }
  if (q.isError) {
    return (
      <>
        <PageTitle title={t.studio.title} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </>
    );
  }

  const o = q.data;
  const listing = o.activations.find((a) => a.id === selected) ?? o.activations[0];
  const trendSummary = `Momentum over 14 days, from ${o.momentumTrend[0]?.momentum ?? 0} to ${o.momentumTrend.at(-1)?.momentum ?? 0}. ${o.momentumTrend.reduce((s, d) => s + d.sales, 0)} bookings.`;

  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        title={t.studio.greeting(o.ownerFirstName)}
        action={
          <Button asChild>
            <Link href="/studio/activations/new">{t.studio.newActivation}</Link>
          </Button>
        }
      />

      {o.pendingHire > 0 ? (
        <Link
          href="/studio/bookings?tab=hire"
          className="flex items-center justify-between gap-4 rounded-card border border-accent/40 bg-accent/[0.07] px-5 py-4 hover:bg-accent/[0.11]"
        >
          <span className="flex items-center gap-3">
            <MessageSquare className="size-5 text-accent" aria-hidden="true" />
            {t.studio.pendingHire(o.pendingHire)}
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-accent">
            {t.studio.answer}
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Stat
            label={t.studio.salesToday}
            value={<NumberTicker value={o.sales.today} format={tshTicker} />}
            sub={t.studio.orders(o.sales.todayCount)}
          />
        </Card>
        <Card>
          <Stat
            label={t.studio.salesWeek}
            value={<NumberTicker value={o.sales.week} format={tshTicker} />}
            sub={t.studio.orders(o.sales.weekCount)}
          />
        </Card>
        <Card>
          <Stat
            label={t.studio.salesMonth}
            value={<NumberTicker value={o.sales.month} format={tshTicker} />}
            sub={t.studio.orders(o.sales.monthCount)}
          />
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{t.studio.momentumTrend}</h2>
        <TrendChart
          data={o.momentumTrend}
          x="day"
          series={[
            { key: "momentum", label: t.living.momentum },
            { key: "sales", label: "Bookings", color: "secondary" },
          ]}
          summary={trendSummary}
        />
      </Card>

      {listing ? (
        <Card className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="flex items-center gap-2.5 font-semibold">
              {listing.signals.busyNow ? <LiveDot label={t.living.busyNow} /> : null}
              {t.studio.rhythm}
            </h2>
            <div className="w-full sm:w-72">
              <label htmlFor="listing-pick" className="sr-only">
                {t.studio.listing}
              </label>
              <NativeSelect id="listing-pick" value={listing.id} onChange={(e) => setSelected(e.target.value)}>
                {o.activations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <RhythmHeatmap rhythm={listing.signals.rhythm} />
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-medium">{t.studio.crowdMix}</h3>
              {listing.signals.crowd.sampleSize ? (
                <>
                  <ShareBars
                    format={(n) => percent(n)}
                    items={[
                      { label: "General", value: listing.signals.crowd.tierShare.general },
                      { label: "VIP", value: listing.signals.crowd.tierShare.vip },
                      { label: "Tables", value: listing.signals.crowd.tierShare.table },
                    ]}
                  />
                  <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4">
                    <div>
                      <dt className="text-xs text-muted">{t.studio.avgSpend}</dt>
                      <dd className="tabular">{tsh(listing.signals.crowd.avgSpend)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{t.studio.repeatRate}</dt>
                      <dd className="tabular">{percent(listing.signals.repeatRate)}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted">
                    {t.studio.sample(listing.signals.crowd.sampleSize)}
                    {listing.crowdLabel ? `. Fans see: "${listing.crowdLabel}"` : ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">{t.living.rhythmEmpty}</p>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{t.studio.upcoming}</h2>
            <Link href="/studio/bookings" className="text-sm text-accent hover:underline">
              {t.common.seeAll}
            </Link>
          </div>
          {o.upcoming.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {o.upcoming.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.fan}</p>
                    <p className="truncate text-xs text-muted">
                      {u.title}, {formatDateTime(u.when)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm tabular">{tsh(u.total)}</span>
                    {u.checkedIn ? <Chip tone="quiet">{t.me.checkedIn}</Chip> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState body={t.studio.upcomingEmpty} className="py-6" />
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">{t.studio.reviews}</h2>
          {o.reviews.length ? (
            <ul className="flex flex-col gap-4">
              {o.reviews.map((r) => (
                <li key={r.id} className="flex flex-col gap-1.5 border-b border-line pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <Rating value={r.rating} size="sm" />
                    <span className="text-xs text-muted">{relativeTime(r.at)}</span>
                  </div>
                  <p className="text-sm text-ink/90">{r.text}</p>
                  <p className="text-xs text-muted">
                    {r.author}, {r.title}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t.studio.reviewsEmpty}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
