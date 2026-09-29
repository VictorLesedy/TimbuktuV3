"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { HireTimeline } from "@/components/activation/hire-card";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList } from "@/components/ui/controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Card, Chip, Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDate, formatDateTime, tsh } from "@/lib/format";
import { errorMessage, useDeclineHire, useIncomingHire, useSendQuote, useStudioBookings } from "@/lib/queries";
import type { HireView } from "@/lib/repo";
import { type Quote, QuoteSchema } from "@/lib/schemas";
import { t } from "@/messages/en";

const TABS = ["orders", "hire"] as const;

export function StudioBookings() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("orders").withOptions({ history: "replace", scroll: false }),
  );
  const hire = useIncomingHire();
  const open = hire.data?.filter((h) => h.status === "sent").length;
  return (
    <>
      <PageTitle title={t.studio.nav.bookings} />
      <Tabs value={tab} onValueChange={(v) => void setTab(v as (typeof TABS)[number])} className="flex flex-col gap-6">
        <TabsList
          label={t.studio.nav.bookings}
          value={tab}
          items={[
            { value: "orders", label: t.studio.bookingsTabs.orders },
            { value: "hire", label: t.studio.bookingsTabs.hire, count: open || undefined },
          ]}
        />
        <TabsContent value="orders">
          <OrdersTable />
        </TabsContent>
        <TabsContent value="hire">
          <HireInbox />
        </TabsContent>
      </Tabs>
    </>
  );
}

const KIND_LABEL = { ticket: "Ticket", reservation: "Table", slot: "Slot", hire: "Hire" } as const;

function OrdersTable() {
  const q = useStudioBookings();
  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data.length) return <EmptyState body={t.studio.bookingsEmpty} />;
  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {q.data.map((o) => (
          <li key={o.id} className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{o.fan}</span>
              <span className="tabular">{tsh(o.total)}</span>
            </div>
            <p className="truncate text-sm text-muted">{o.title}</p>
            <div className="flex items-center justify-between gap-3 text-xs text-muted">
              <span>
                {KIND_LABEL[o.kind]}, {formatDateTime(o.scheduledFor ?? o.createdAt)}
              </span>
              {o.checkedInAt ? <Chip tone="quiet">{t.me.checkedIn}</Chip> : null}
            </div>
          </li>
        ))}
      </ul>
      <div className="relative hidden overflow-x-auto rounded-card bg-surface md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3 font-medium">
                Guest
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                {t.studio.listing}
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Type
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                For
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Code
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {q.data.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3 font-medium">{o.fan}</td>
                <td className="max-w-56 truncate px-5 py-3">{o.title}</td>
                <td className="px-5 py-3 text-muted">{KIND_LABEL[o.kind]}</td>
                <td className="px-5 py-3 whitespace-nowrap text-muted">{formatDateTime(o.scheduledFor ?? o.createdAt)}</td>
                <td className="px-5 py-3 font-mono text-xs">
                  {o.code}
                  {o.checkedInAt ? <span className="ml-2 font-sans text-muted">{t.me.checkedIn}</span> : null}
                </td>
                <td className="px-5 py-3 text-right tabular">{tsh(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HireInbox() {
  const q = useIncomingHire();
  const decline = useDeclineHire();
  const [quoting, setQuoting] = React.useState<HireView | null>(null);
  if (q.isPending) return <Skeleton className="h-64" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data.length) return <EmptyState body={t.studio.hireEmpty} />;
  const sorted = [...q.data].sort(
    (a, b) => Number(b.status === "sent") - Number(a.status === "sent") || b.createdAt.localeCompare(a.createdAt),
  );
  return (
    <>
      <ul className="grid gap-4 lg:grid-cols-2">
        {sorted.map((h) => (
          <li key={h.id}>
            <Card className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{h.fanName}</p>
                  <p className="text-sm text-muted">{h.activationTitle}</p>
                </div>
                <Chip tone={h.status === "sent" ? "accent" : "quiet"}>{t.professional.timeline[h.status]}</Chip>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">{t.professional.date}</dt>
                  <dd>{formatDate(new Date(`${h.details.date}T12:00:00`).toISOString(), { year: "numeric" })}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t.professional.location}</dt>
                  <dd>{h.details.location}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t.professional.duration}</dt>
                  <dd>{h.details.durationHours}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Budget</dt>
                  <dd className="tabular">{tsh(h.details.budget)}</dd>
                </div>
              </dl>
              {h.details.note ? <p className="rounded-2xl bg-canvas/50 p-3 text-sm text-ink/90">{h.details.note}</p> : null}
              {h.quote ? (
                <p className="text-sm">
                  <span className="text-muted">Your quote: </span>
                  <span className="tabular">{tsh(h.quote.price)}</span>
                </p>
              ) : null}
              <HireTimeline hire={h} />
              {h.status === "sent" ? (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button onClick={() => setQuoting(h)}>{t.studio.quote}</Button>
                  <Button
                    variant="danger"
                    disabled={decline.isPending}
                    onClick={async () => {
                      try {
                        await decline.mutateAsync(h.id);
                        toast.success(t.studio.requestDeclined);
                      } catch (err) {
                        toast.error(errorMessage(err));
                      }
                    }}
                  >
                    {t.studio.declineRequest}
                  </Button>
                </div>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
      <QuoteDialog hire={quoting} onClose={() => setQuoting(null)} />
    </>
  );
}

const defaultExpiry = () => new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

function QuoteDialog({ hire, onClose }: { hire: HireView | null; onClose: () => void }) {
  const send = useSendQuote();
  const form = useForm<z.input<typeof QuoteSchema>, unknown, Quote>({
    resolver: zodResolver(QuoteSchema),
    defaultValues: { price: 0, terms: "", expiresAt: defaultExpiry() },
  });
  const { register, handleSubmit, reset, formState } = form;

  React.useEffect(() => {
    if (hire)
      reset({
        price: hire.details.budget,
        terms: `${hire.details.durationHours} hours, own equipment, travel within the city included.`,
        expiresAt: defaultExpiry(),
      });
  }, [hire, reset]);

  const submit = handleSubmit(async (quote) => {
    if (!hire) return;
    try {
      const expires = new Date(`${quote.expiresAt}T23:59:00`);
      if (expires.getTime() < Date.now()) {
        form.setError("expiresAt", { message: "Choose a date in the future" });
        return;
      }
      // The API takes the date and sets the time to 23:59 local.
      await send.mutateAsync({ id: hire.id, quote });
      toast.success(t.studio.quoteSent);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const e = formState.errors;
  return (
    <Dialog open={Boolean(hire)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t.studio.quoteTitle}
        description={hire ? `${hire.fanName}, ${t.studio.fanBudget(tsh(hire.details.budget))}` : undefined}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label={t.studio.quotePrice} htmlFor="q-price" error={e.price?.message}>
            <Input id="q-price" type="number" inputMode="numeric" step={10000} aria-invalid={Boolean(e.price)} {...register("price")} />
          </Field>
          <Field label={t.studio.quoteTerms} htmlFor="q-terms" error={e.terms?.message}>
            <Textarea id="q-terms" placeholder={t.studio.quoteTermsPlaceholder} aria-invalid={Boolean(e.terms)} {...register("terms")} />
          </Field>
          <Field label={t.studio.quoteExpiry} htmlFor="q-exp" error={e.expiresAt?.message}>
            <Input id="q-exp" type="date" aria-invalid={Boolean(e.expiresAt)} {...register("expiresAt")} />
          </Field>
          <Button type="submit" size="lg" disabled={send.isPending}>
            {send.isPending ? "Sending" : t.studio.quote}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
