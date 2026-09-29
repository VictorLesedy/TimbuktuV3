"use client";

import { CheckCircle2, Search, XCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Card, Progress, Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDateTime, formatTime } from "@/lib/format";
import { errorMessage, useCheckIn, useCheckInQueue, useCheckInTargets } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

type Result = { ok: boolean; text: string; key: number };

export function CheckIn() {
  const targets = useCheckInTargets();
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [search, setSearch] = React.useState("");
  const deferred = React.useDeferredValue(search);
  const [result, setResult] = React.useState<Result | null>(null);
  const checkIn = useCheckIn();
  const reduce = useReducedMotion();
  const codeRef = React.useRef<HTMLInputElement>(null);

  const active = targetId ?? targets.data?.[0]?.id ?? null;
  const target = targets.data?.find((x) => x.id === active);
  const queue = useCheckInQueue(active, deferred);

  async function scan(value: string) {
    const clean = value.trim();
    if (!clean) {
      setResult({ ok: false, text: "Type or scan a ticket code first.", key: Date.now() });
      codeRef.current?.focus();
      return;
    }
    try {
      const order = await checkIn.mutateAsync(clean);
      setResult({ ok: true, text: t.studio.checkin.done(order.fan), key: Date.now() });
      setCode("");
    } catch (err) {
      setResult({ ok: false, text: errorMessage(err), key: Date.now() });
    }
    codeRef.current?.focus();
  }

  return (
    <>
      <PageTitle title={t.studio.checkin.title} />
      {targets.isPending ? (
        <Skeleton className="h-96" />
      ) : targets.isError ? (
        <ErrorState error={targets.error} onRetry={() => targets.refetch()} />
      ) : !targets.data.length || !target ? (
        <EmptyState body={t.studio.checkin.noTargets} />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label={t.studio.checkin.pick} htmlFor="ci-target">
              <NativeSelect id="ci-target" value={target.id} onChange={(e) => setTargetId(e.target.value)}>
                {targets.data.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                    {x.when ? `, ${formatDateTime(x.when)}` : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="flex min-w-48 flex-col gap-2">
              <p className="text-sm text-muted tabular" aria-live="polite">
                {t.studio.checkin.expected(target.expected, target.checkedIn)}
              </p>
              <Progress value={target.expected ? target.checkedIn / target.expected : 0} label="Checked in" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card className="flex flex-col gap-5">
              <h2 className="font-semibold">{t.studio.checkin.scanTitle}</h2>
              <div aria-label={t.studio.checkin.camera} role="img" className="relative aspect-square overflow-hidden rounded-2xl bg-canvas">
                <div aria-hidden="true" className="absolute inset-8 rounded-2xl border-2 border-dashed border-ink/25" />
                {!reduce ? (
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-x-10 h-px bg-accent shadow-[0_0_12px_2px_color-mix(in_oklab,var(--color-accent)_60%,transparent)]"
                    initial={{ top: "15%" }}
                    animate={{ top: ["15%", "85%", "15%"] }}
                    transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  />
                ) : null}
                <AnimatePresence>
                  {result ? (
                    <motion.div
                      key={result.key}
                      initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn("absolute inset-0 grid place-items-center", result.ok ? "bg-accent/15" : "bg-live/15")}
                    >
                      {result.ok ? (
                        <CheckCircle2 className="size-16 text-accent" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-16 text-live" aria-hidden="true" />
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              <p
                role="status"
                aria-live="assertive"
                className={cn("min-h-10 text-sm", result ? (result.ok ? "text-ink" : "text-live") : "text-muted")}
              >
                {result?.text ?? t.studio.checkin.scanHint}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void scan(code);
                }}
                className="flex flex-col gap-3"
                noValidate
              >
                <Field label={t.studio.checkin.code} htmlFor="ci-code">
                  <Input
                    ref={codeRef}
                    id="ci-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder={t.studio.checkin.codePlaceholder}
                    autoComplete="off"
                    autoCapitalize="characters"
                    className="font-mono tracking-wider"
                  />
                </Field>
                <Button type="submit" size="lg" disabled={checkIn.isPending}>
                  {t.studio.checkin.cta}
                </Button>
              </form>
            </Card>

            <Card className="flex min-w-0 flex-col gap-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <label htmlFor="ci-search" className="sr-only">
                  {t.studio.checkin.search}
                </label>
                <Input
                  id="ci-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.studio.checkin.searchPlaceholder}
                  className="pl-11"
                />
              </div>
              {queue.isPending ? (
                <Skeleton className="h-64" />
              ) : queue.isError ? (
                <ErrorState error={queue.error} onRetry={() => queue.refetch()} />
              ) : !queue.data.length ? (
                <p className="py-6 text-center text-sm text-muted">{t.studio.checkin.queueEmpty}</p>
              ) : (
                <ul className={cn("flex flex-col divide-y divide-line", queue.isFetching && "opacity-70")}>
                  {queue.data.map((o) => {
                    const qty = o.lines.reduce((s, l) => s + l.qty, 0);
                    return (
                      <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{o.fan}</p>
                          <p className="truncate text-xs text-muted">
                            <span className="font-mono">{o.code}</span>, {o.lines[0]?.label}
                            {qty > 1 ? `, admits ${qty}` : ""}
                          </p>
                        </div>
                        {o.checkedInAt ? (
                          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                            <CheckCircle2 className="size-4 text-accent" aria-hidden="true" />
                            {formatTime(o.checkedInAt)}
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" disabled={checkIn.isPending} onClick={() => scan(o.code)}>
                            {t.studio.checkin.cta}
                            <span className="sr-only"> {o.fan}</span>
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
