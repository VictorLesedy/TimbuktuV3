"use client";

import { Search, Star } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/controls";
import { Input } from "@/components/ui/field";
import { Chip, Skeleton } from "@/components/ui/misc";
import { LiveDot } from "@/components/ui/signals";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { tsh } from "@/lib/format";
import { errorMessage, useAdminActivations, useAdminPause, useSetFeatured } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

export function AdminActivations() {
  const [q, setQ] = useQueryState("q", parseAsString.withDefault("").withOptions({ history: "replace", scroll: false }));
  const [input, setInput] = React.useState(q);
  const deferred = React.useDeferredValue(input);
  React.useEffect(() => {
    if (deferred !== q) void setQ(deferred || null);
  }, [deferred, q, setQ]);
  const list = useAdminActivations(q);
  const feature = useSetFeatured();
  const pause = useAdminPause();

  async function run(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageTitle title={t.admin.nav.activations} />
      <div className="relative mb-6 max-w-lg">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <label htmlFor="adm-q" className="sr-only">
          {t.common.search}
        </label>
        <Input
          id="adm-q"
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.admin.searchPlaceholder}
          className="pl-11"
        />
      </div>
      {list.isPending ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : !list.data.length ? (
        <EmptyState body={t.admin.activationsEmpty} />
      ) : (
        <div className={cn("relative overflow-x-auto rounded-card bg-surface", list.isFetching && "opacity-70")}>
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-3 font-medium">
                  Listing
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  City
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  From
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  48h
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  {t.admin.featured}
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((c) => {
                const a = c.activation;
                return (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {c.signals.busyNow ? <LiveDot label={t.living.busyNow} /> : null}
                        <Link href={`/a/${a.slug}`} className="font-medium hover:underline">
                          {a.title}
                        </Link>
                      </div>
                      <p className="text-xs text-muted">
                        {c.provider.name}, {t.types[a.type].one}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-muted">{a.city}</td>
                    <td className="px-5 py-3">
                      <Chip tone={a.status === "live" ? "default" : "quiet"}>{t.studio.status[a.status]}</Chip>
                    </td>
                    <td className="px-5 py-3 text-right tabular">{tsh(c.fromPrice)}</td>
                    <td className="px-5 py-3 text-right tabular">{c.signals.sales48h}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          aria-label={`${t.admin.feature} ${a.title}`}
                          checked={a.featured}
                          disabled={feature.isPending || a.status !== "live"}
                          onCheckedChange={(v) =>
                            run(
                              () => feature.mutateAsync({ id: a.id, featured: v }),
                              v ? `${t.admin.featured}: ${a.title}` : `${t.admin.unfeature}: ${a.title}`,
                            )
                          }
                        />
                        {a.featured ? <Star className="size-4 fill-accent text-accent" aria-hidden="true" /> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {a.status === "live" || a.status === "paused" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pause.isPending}
                          onClick={() =>
                            run(
                              () => pause.mutateAsync({ id: a.id, paused: a.status === "live" }),
                              a.status === "live" ? t.studio.paused : t.studio.resumed,
                            )
                          }
                        >
                          {a.status === "live" ? t.admin.pause : t.admin.resume}
                          <span className="sr-only"> {a.title}</span>
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
