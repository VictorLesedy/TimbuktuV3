"use client";

import { BadgeCheck, ChevronLeft, MapPin } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Chip, Skeleton } from "@/components/ui/misc";
import { Rating } from "@/components/ui/signals";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDate, tsh } from "@/lib/format";
import { useActivation } from "@/lib/queries";
import { type ActivationDetail, ApiError, recordView } from "@/lib/repo";
import { t } from "@/messages/en";
import { Gallery } from "./gallery";
import { LivingPanel } from "./living-panel";
import { EventPanel } from "./panels/event-panel";
import { ProfessionalPanel } from "./panels/professional-panel";
import { ServicePanel } from "./panels/service-panel";
import { VenuePanel } from "./panels/venue-panel";
import { SaveButton, ShareSheet } from "./save-share";

function ActionPanel({ d }: { d: ActivationDetail }) {
  const a = d.activation;
  if (a.event) return <EventPanel activation={{ ...a, event: a.event }} />;
  if (a.venue) return <VenuePanel activation={{ ...a, venue: a.venue }} signals={d.signals} />;
  if (a.service) return <ServicePanel activation={{ ...a, service: a.service }} />;
  if (a.professional) return <ProfessionalPanel activation={{ ...a, professional: a.professional }} />;
  return null;
}

export function DetailView({ slug }: { slug: string }) {
  const q = useActivation(slug);
  const viewed = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (q.data && viewed.current !== q.data.activation.id) {
      viewed.current = q.data.activation.id;
      void recordView(q.data.activation.id);
    }
  }, [q.data]);

  if (q.isPending) return <DetailSkeleton />;
  if (q.isError) {
    const notFound = q.error instanceof ApiError && q.error.code === "not_found";
    return (
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pt-10 md:px-8">
        <h1 className="font-display text-display-md">{notFound ? t.detail.notFoundTitle : t.states.errorTitle}</h1>
        {notFound ? (
          <EmptyState
            body={q.error.message}
            action={
              <Button asChild>
                <Link href="/explore">{t.checkout.browse}</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        )}
      </div>
    );
  }

  const d = q.data;
  const a = d.activation;
  const type = t.types[a.type];

  return (
    <article className="mx-auto max-w-[1280px] px-5 pt-5 md:px-8 md:pt-8">
      <Link href="/explore" className="mb-5 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t.nav.explore}
      </Link>

      {a.status !== "live" ? (
        <p role="status" className="mb-5 rounded-2xl border border-accent/40 bg-accent/[0.08] px-4 py-3 text-sm text-ink">
          {t.detail.previewBanner}
        </p>
      ) : null}

      {/* One booking box: after "About" on mobile, a sticky sidebar on desktop. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-12">
        <div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-1">
          <Gallery media={a.media} title={a.title} />

          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="quiet">{type.one}</Chip>
              {a.featured ? <Chip tone="accent">Featured</Chip> : null}
            </div>
            <h1 className="font-display text-display-lg text-balance">{a.title}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {a.location.area}, {a.city}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {t.detail.hostedBy} <span className="text-ink">{d.provider.name}</span>
                {d.provider.verified ? <BadgeCheck className="size-4 text-accent" aria-label={t.common.verified} /> : null}
              </span>
              {d.signals.rating ? <Rating value={d.signals.rating} count={d.signals.reviewCount} size="sm" /> : null}
            </div>
            <div className="flex gap-2">
              <SaveButton activationId={a.id} saved={d.saved} />
              <ShareSheet activationId={a.id} slug={a.slug} title={a.title} />
            </div>
          </header>

          <section aria-labelledby="about-title" className="flex flex-col gap-3">
            <h2 id="about-title" className="text-lg font-semibold">
              {t.detail.about}
            </h2>
            <p className="measure leading-relaxed text-ink/90">{a.description}</p>
            {a.event?.lineup.length ? (
              <div className="mt-2 flex flex-col gap-2">
                <h3 className="text-sm text-muted">{t.detail.lineup}</h3>
                <ul className="flex flex-wrap gap-2">
                  {a.event.lineup.map((name) => (
                    <li key={name}>
                      <Chip>{name}</Chip>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-24">
            <BookingBox d={d} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-10 lg:col-start-1 lg:row-start-2">
          <LivingPanel card={d} />

          <section aria-labelledby="reviews-title" className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="reviews-title" className="text-lg font-semibold">
                {t.detail.reviewsTitle}
              </h2>
              {d.signals.reviewCount ? <span className="text-sm text-muted">{t.common.reviews(d.signals.reviewCount)}</span> : null}
            </div>
            {d.reviews.length ? (
              <ul className="grid gap-4 md:grid-cols-2">
                {d.reviews.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 rounded-card border border-line p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Rating value={r.rating} size="sm" />
                      <span className="text-xs text-muted">{formatDate(r.at)}</span>
                    </div>
                    <p className="text-pretty text-ink/90">{r.text}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="text-ink">{r.author}</span>
                      <BadgeCheck className="size-3.5 text-accent" aria-hidden="true" />
                      {t.common.verifiedAttendee}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{t.detail.reviewsEmpty}</p>
            )}
          </section>
        </div>
      </div>

      <MobileBar d={d} />
    </article>
  );
}

function BookingBox({ d }: { d: ActivationDetail }) {
  return (
    <section id="book" aria-labelledby="book-title" className="scroll-mt-24 rounded-card bg-surface p-5 md:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 id="book-title" className="text-lg font-semibold">
          {t.types[d.activation.type].verb}
        </h2>
        <span className="text-sm text-muted">
          {t.common.from} <span className="text-ink tabular">{tsh(d.fromPrice)}</span>
        </span>
      </div>
      <ActionPanel d={d} />
    </section>
  );
}

/** Mobile shortcut to the booking box, shown only while it is off screen. */
function MobileBar({ d }: { d: ActivationDetail }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const target = document.getElementById("book");
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry?.isIntersecting && (entry?.boundingClientRect.top ?? 0) > 0), {
      threshold: 0,
    });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-canvas/95 px-5 py-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{d.activation.title}</p>
          <p className="text-sm text-muted">
            {t.common.from} <span className="text-ink tabular">{tsh(d.fromPrice)}</span>
          </p>
        </div>
        <Button onClick={() => document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          {t.types[d.activation.type].verb}
        </Button>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 px-5 pt-14 md:px-8 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true">
      <div className="flex flex-col gap-6">
        <Skeleton className="aspect-[16/10] md:aspect-[16/9]" />
        <Skeleton className="h-14 w-3/4 rounded-2xl" />
        <Skeleton className="h-4 w-1/2 rounded-full" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="hidden h-[520px] lg:block" />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
