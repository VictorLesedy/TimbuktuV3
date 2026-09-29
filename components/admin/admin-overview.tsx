"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ShareBars, TrendChart } from "@/components/charts/charts";
import { PageTitle } from "@/components/shell/console-shell";
import { Card, Skeleton, Stat } from "@/components/ui/misc";
import { NumberTicker } from "@/components/ui/signals";
import { ErrorState } from "@/components/ui/states";
import { tsh } from "@/lib/format";
import { useAdminTotals } from "@/lib/queries";
import { t } from "@/messages/en";

export function AdminOverview() {
  const q = useAdminTotals();
  if (q.isPending) {
    return (
      <>
        <PageTitle title={t.admin.nav.overview} />
        <div className="grid gap-4 sm:grid-cols-3">
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
        <PageTitle title={t.admin.nav.overview} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </>
    );
  }
  const d = q.data;
  const total = d.byType.reduce((s, x) => s + x.gross, 0);
  return (
    <div className="flex flex-col gap-8">
      <PageTitle title={t.admin.nav.overview} />
      {d.pendingApprovals ? (
        <Link
          href="/admin/approvals"
          className="flex items-center justify-between gap-4 rounded-card border border-accent/40 bg-accent/[0.07] px-5 py-4 hover:bg-accent/[0.11]"
        >
          <span>{t.admin.pending(d.pendingApprovals)}</span>
          <span className="flex items-center gap-1 text-sm font-medium text-accent">
            {t.admin.review}
            <ArrowRight className="size-4" aria-hidden="true" />
          </span>
        </Link>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Stat label={t.admin.gross} value={<NumberTicker value={d.gross30} format={tsh} />} />
        </Card>
        <Card>
          <Stat label={t.admin.commission} value={<NumberTicker value={d.commission30} format={tsh} />} />
        </Card>
        <Card>
          <Stat label={t.admin.live} value={<NumberTicker value={d.liveActivations} />} />
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">{t.admin.dailyTitle}</h2>
          <TrendChart
            data={d.daily}
            x="day"
            series={[
              { key: "gross", label: "Gross", format: tsh },
              { key: "commission", label: "Commission", color: "secondary", format: tsh },
            ]}
            summary={`Daily gross sales over 30 days, totalling ${tsh(d.gross30)}.`}
          />
        </Card>
        <Card className="flex flex-col gap-5">
          <h2 className="font-semibold">{t.admin.byType}</h2>
          <ShareBars
            format={(n) => `${tsh(n)} (${total ? Math.round((n / total) * 100) : 0}%)`}
            items={d.byType.map((x) => ({ label: t.types[x.type].many, value: x.gross }))}
          />
        </Card>
      </div>
    </div>
  );
}
