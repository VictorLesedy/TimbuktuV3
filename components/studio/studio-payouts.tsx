"use client";

import { PayoutDialog } from "@/components/fan/payout-dialog";
import { PageTitle } from "@/components/shell/console-shell";
import { Card, Chip, Skeleton, Stat } from "@/components/ui/misc";
import { NumberTicker } from "@/components/ui/signals";
import { ErrorState } from "@/components/ui/states";
import { formatDate, tsh } from "@/lib/format";
import { useStudioPayout, useStudioPayouts } from "@/lib/queries";
import { t } from "@/messages/en";

const p = t.studio.payouts;

export function StudioPayouts() {
  const q = useStudioPayouts();
  const payout = useStudioPayout();
  if (q.isPending) {
    return (
      <>
        <PageTitle title={t.studio.nav.payouts} />
        <Skeleton className="h-32" />
        <Skeleton className="mt-6 h-96" />
      </>
    );
  }
  if (q.isError) {
    return (
      <>
        <PageTitle title={t.studio.nav.payouts} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </>
    );
  }
  const d = q.data;
  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        title={t.studio.nav.payouts}
        action={
          <PayoutDialog
            balance={d.balance}
            defaultPhone={d.payoutPhone}
            trigger={p.withdraw}
            title={p.withdraw}
            amountLabel={p.amount}
            phoneLabel={p.phone}
            cta={p.cta}
            done={p.done}
            onSubmit={(v) => payout.mutateAsync(v)}
          />
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Stat label={p.balance} value={<NumberTicker value={d.balance} format={tsh} />} />
        </Card>
        <Card>
          <Stat label={p.lifetime} value={tsh(d.lifetimeGross)} />
        </Card>
        <Card>
          <Stat label={p.commission} value={tsh(d.lifetimeCommission)} />
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-0 md:p-0">
        <h2 className="px-5 pt-5 font-semibold md:px-6 md:pt-6">{p.transactions}</h2>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-3 font-medium md:px-6">
                  {p.cols.order}
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  {p.cols.listing}
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  {p.cols.date}
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  {p.cols.gross}
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  {p.cols.commission}
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium md:px-6">
                  {p.cols.net}
                </th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.orderId} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-mono text-xs md:px-6">{r.code}</td>
                  <td className="max-w-56 truncate px-5 py-3">{r.title}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted">{formatDate(r.at)}</td>
                  <td className="px-5 py-3 text-right tabular">{tsh(r.gross)}</td>
                  <td className="px-5 py-3 text-right text-muted tabular">−{tsh(r.commission)}</td>
                  <td className="px-5 py-3 text-right tabular md:px-6">{tsh(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{p.history}</h2>
        {d.history.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {d.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="tabular">{tsh(h.amount)}</p>
                  <p className="text-xs text-muted">
                    {formatDate(h.at)}, to {h.phone}
                  </p>
                </div>
                <Chip tone={h.status === "sent" ? "quiet" : "accent"}>{p.status[h.status as "sent" | "processing"] ?? h.status}</Chip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{p.historyEmpty}</p>
        )}
      </Card>
    </div>
  );
}
