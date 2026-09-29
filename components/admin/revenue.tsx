"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { toast } from "sonner";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { NativeSelect } from "@/components/ui/field";
import { Card, Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CITIES } from "@/lib/config";
import { formatDate, tsh } from "@/lib/format";
import { useRevenue } from "@/lib/queries";
import type { RevenueReport } from "@/lib/repo";
import type { City } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

const r = t.admin.revenue;
const PAGE = 20;
const PARTIES = ["provider", "platform", "government", "partner", "ambassador"] as const;
const PARTY_COLOR: Record<(typeof PARTIES)[number], string> = {
  provider: "var(--color-chart-2)",
  platform: "var(--color-chart-1)",
  government: "var(--color-chart-3)",
  partner: "var(--color-chart-4)",
  ambassador: "var(--color-chart-5)",
};

const parsers = {
  days: parseAsInteger.withDefault(30),
  city: parseAsStringLiteral(CITIES as readonly City[]),
  page: parseAsInteger.withDefault(1),
};

function toCsv(report: RevenueReport) {
  const head = ["date", "order", "listing", "city", "type", "gross", "provider", "platform", "government", "partner", "ambassador"];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = report.rows.map((x) =>
    [x.at.slice(0, 10), x.code, x.title, x.city, x.type, x.gross, x.provider, x.platform, x.government, x.partner, x.ambassador]
      .map(esc)
      .join(","),
  );
  const tot = report.totals;
  lines.push(
    ["total", "", "", "", "", tot.gross, tot.provider, tot.platform, tot.government, tot.partner, tot.ambassador].map(esc).join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function Revenue() {
  const [f, set] = useQueryStates(parsers, { history: "replace", scroll: false });
  const days = [7, 30, 90].includes(f.days) ? f.days : 30;
  const q = useRevenue(days, f.city);

  function exportCsv() {
    if (!q.data) return;
    const blob = new Blob([toCsv(q.data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timbuktu-revenue-${days}d${f.city ? `-${f.city.toLowerCase().replace(/\s+/g, "-")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(r.exported(q.data.rows.length));
  }

  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        title={r.title}
        action={
          <Button variant="outline" onClick={exportCsv} disabled={!q.data?.rows.length}>
            <Download />
            {r.export}
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted">{r.range}</span>
          <Segmented<string>
            label={r.range}
            value={String(days)}
            onChange={(v) => set({ days: Number(v), page: 1 })}
            options={[7, 30, 90].map((d) => ({ value: String(d), label: r.ranges[d] ?? `${d} days` }))}
          />
        </div>
        <div className="flex w-48 flex-col gap-2">
          <label htmlFor="rev-city" className="text-sm text-muted">
            {r.city}
          </label>
          <NativeSelect
            id="rev-city"
            className="h-11"
            value={f.city ?? ""}
            onChange={(e) => set({ city: (e.target.value || null) as City | null, page: 1 })}
          >
            <option value="">{r.allCities}</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {q.isPending ? (
        <>
          <Skeleton className="h-48" />
          <Skeleton className="h-96" />
        </>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data.rows.length ? (
        <EmptyState body={r.empty} />
      ) : (
        <Report report={q.data} page={f.page} setPage={(p) => set({ page: p })} />
      )}
    </div>
  );
}

function Report({ report, page, setPage }: { report: RevenueReport; page: number; setPage: (p: number) => void }) {
  const tot = report.totals;
  const sumParts = PARTIES.reduce((s, p) => s + tot[p], 0);
  const reconciles = sumParts === tot.gross;
  const pages = Math.max(1, Math.ceil(report.rows.length / PAGE));
  const current = Math.min(Math.max(1, page), pages);
  const rows = report.rows.slice((current - 1) * PAGE, current * PAGE);

  return (
    <>
      <Card className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">{r.parties.gross}</span>
          <span className="font-display text-display-lg tabular">{tsh(tot.gross)}</span>
        </div>
        <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full">
          {PARTIES.map((p) => (
            <div key={p} style={{ width: `${(tot[p] / Math.max(1, tot.gross)) * 100}%`, background: PARTY_COLOR[p] }} />
          ))}
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PARTIES.map((p) => (
            <div key={p} className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 text-sm text-muted">
                <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: PARTY_COLOR[p] }} />
                {r.parties[p]}
              </dt>
              <dd className="tabular">
                {tsh(tot[p])}
                <span className="ml-1.5 text-xs text-muted">{((tot[p] / Math.max(1, tot.gross)) * 100).toFixed(1)}%</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className={cn("flex items-center gap-2 text-sm", reconciles ? "text-muted" : "text-live")}>
          <CheckCircle2 className={cn("size-4", reconciles ? "text-accent" : "text-live")} aria-hidden="true" />
          {reconciles ? r.reconciles : `Mismatch of ${tsh(tot.gross - sumParts)}`}
        </p>
      </Card>

      <Card className="flex flex-col gap-0 p-0 md:p-0">
        <h2 className="px-5 pt-5 pb-4 font-semibold md:px-6 md:pt-6">{r.ledger}</h2>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-y border-line">
                <th scope="col" className="px-5 py-3 font-medium md:px-6">
                  {r.cols.date}
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  {r.cols.order}
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  {r.cols.listing}
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  {r.cols.city}
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Gross
                </th>
                {PARTIES.map((p) => (
                  <th key={p} scope="col" className="px-3 py-3 text-right font-medium last:pr-5 md:last:pr-6">
                    {r.parties[p].split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.orderId} className="border-b border-line">
                  <td className="px-5 py-2.5 whitespace-nowrap text-muted md:px-6">{formatDate(x.at)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{x.code}</td>
                  <td className="max-w-48 truncate px-3 py-2.5">{x.title}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted">{x.city}</td>
                  <td className="px-3 py-2.5 text-right tabular">{tsh(x.gross)}</td>
                  {PARTIES.map((p) => (
                    <td key={p} className="px-3 py-2.5 text-right text-muted tabular last:pr-5 md:last:pr-6">
                      {x[p] ? tsh(x[p]) : "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-medium">
                <th scope="row" colSpan={4} className="px-5 py-3 text-left md:px-6">
                  {r.totalsRow}
                </th>
                <td className="px-3 py-3 text-right tabular">{tsh(tot.gross)}</td>
                {PARTIES.map((p) => (
                  <td key={p} className="px-3 py-3 text-right tabular last:pr-5 md:last:pr-6">
                    {tsh(tot[p])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <nav aria-label="Ledger pages" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 md:px-6">
          <span className="text-sm text-muted tabular">{r.page(current, pages)}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={r.prev} disabled={current <= 1} onClick={() => setPage(current - 1)}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={r.next} disabled={current >= pages} onClick={() => setPage(current + 1)}>
              <ChevronRight />
            </Button>
          </div>
        </nav>
      </Card>
    </>
  );
}
