"use client";

import { Check, ChevronLeft, Copy } from "lucide-react";
import Link from "next/link";
import { TrendChart } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import { Card, Chip, Progress, Skeleton, Stat } from "@/components/ui/misc";
import { NumberTicker } from "@/components/ui/signals";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDate, relativeTime, tsh } from "@/lib/format";
import { useCopy } from "@/lib/hooks";
import { useAmbassador, useAmbassadorPayout, useMe } from "@/lib/queries";
import { t } from "@/messages/en";
import { PayoutDialog } from "./payout-dialog";

export function AmbassadorView() {
  const me = useMe();
  const unlocked = me.data?.progress.level === "ambassador";
  const stats = useAmbassador();
  const payout = useAmbassadorPayout();
  const { copied, copy } = useCopy();

  const header = (
    <div className="flex flex-col gap-3">
      <Link href="/me" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t.me.title}
      </Link>
      <h1 className="font-display text-display-lg">{t.ambassador.title}</h1>
    </div>
  );

  if (me.isPending || (unlocked && stats.isPending)) {
    return (
      <Wrap>
        {header}
        <Skeleton className="h-32" />
        <Skeleton className="h-72" />
      </Wrap>
    );
  }
  if (me.isError)
    return (
      <Wrap>
        {header}
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      </Wrap>
    );

  if (!me.data.user) {
    return (
      <Wrap>
        {header}
        <EmptyState
          title={t.me.explorerTitle}
          body={t.me.explorerBody}
          action={
            <Button asChild>
              <Link href="/onboarding">{t.nav.signUp}</Link>
            </Button>
          }
        />
      </Wrap>
    );
  }

  if (!unlocked) {
    const p = me.data.progress;
    return (
      <Wrap>
        {header}
        <Card className="flex flex-col gap-5">
          <h2 className="text-xl font-semibold">{t.ambassador.lockedTitle}</h2>
          <p className="text-muted">{t.ambassador.lockedBody}</p>
          {p.pendingEarnings > 0 ? <p className="text-ink">{t.ambassador.waiting(tsh(p.pendingEarnings))}</p> : null}
          <Progress value={p.ratio} label={t.me.levelProgress} />
          <Button asChild variant="outline" className="self-start">
            <Link href="/me">{t.me.levelProgress}</Link>
          </Button>
        </Card>
      </Wrap>
    );
  }

  if (stats.isError)
    return (
      <Wrap>
        {header}
        <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
      </Wrap>
    );
  const s = stats.data;
  if (!s) return null;
  const link =
    typeof window === "undefined"
      ? s.referralLink
      : `${window.location.origin}${s.referralLink.startsWith("/") ? "" : "/"}${s.referralLink.replace(/^https?:\/\/[^/]+\/?/, "")}`;

  return (
    <Wrap>
      {header}

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm text-muted">{t.ambassador.link}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="flex h-12 min-w-0 flex-1 items-center truncate rounded-field bg-canvas/60 px-4 font-mono text-sm">{link}</code>
          <Button variant="secondary" className="h-12" onClick={() => copy(link)} aria-live="polite">
            {copied ? <Check /> : <Copy />}
            {copied ? t.common.copied : t.common.copy}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Stat label={t.ambassador.followers} value={<NumberTicker value={s.followers} />} />
        <Stat label={t.ambassador.salesDriven} value={<NumberTicker value={s.salesDriven} />} sub={tsh(s.grossDriven)} />
        <Stat label={t.ambassador.earnings} value={tsh(s.earnings)} />
        <Stat label={t.ambassador.balance} value={tsh(s.balance)} />
      </div>

      <div>
        <PayoutDialog
          balance={s.balance}
          defaultPhone={me.data.user.phone}
          trigger={t.ambassador.withdraw}
          title={t.ambassador.withdrawTitle}
          amountLabel={t.ambassador.amount}
          phoneLabel={t.checkout.phone}
          cta={t.ambassador.withdrawCta}
          done={t.ambassador.withdrawn}
          onSubmit={(v) => payout.mutateAsync(v)}
        />
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{t.ambassador.chartTitle}</h2>
        <TrendChart
          kind="bar"
          data={s.weekly}
          x="week"
          series={[{ key: "earnings", label: t.ambassador.earnings, format: tsh }]}
          summary={`Earnings over ${s.weekly.length} weeks, totalling ${tsh(s.earnings)}.`}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">{t.ambassador.recent}</h2>
          {s.recent.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {s.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{r.title}</p>
                    <p className="text-xs text-muted">{relativeTime(r.at)}</p>
                  </div>
                  <span className="shrink-0 text-accent tabular">+{tsh(r.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t.ambassador.recentEmpty}</p>
          )}
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">{t.ambassador.payouts}</h2>
          {s.payouts.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {s.payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="tabular">{tsh(p.amount)}</p>
                    <p className="text-xs text-muted">{formatDate(p.at)}</p>
                  </div>
                  <Chip tone={p.status === "sent" ? "quiet" : "accent"}>{p.status === "sent" ? "Sent" : "Processing"}</Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t.ambassador.payoutsEmpty}</p>
          )}
        </Card>
      </div>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 pt-8 md:px-8 md:pt-12">{children}</div>;
}
