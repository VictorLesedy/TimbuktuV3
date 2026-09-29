"use client";

import { ArrowRight, Check, Eye, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { toast } from "sonner";
import { ActivationCard, ActivationCardSkeleton } from "@/components/activation/activation-card";
import { HireCard } from "@/components/activation/hire-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList } from "@/components/ui/controls";
import { Card, Chip, Progress, Skeleton } from "@/components/ui/misc";
import { Rating } from "@/components/ui/signals";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDate, relativeTime, tsh } from "@/lib/format";
import {
  errorMessage,
  useActivity,
  useMe,
  useMyHireRequests,
  useMyOrders,
  useMyReviews,
  useReviewable,
  useSaved,
  useUnlockAmbassador,
} from "@/lib/queries";
import type { LevelProgress, MyOrder } from "@/lib/repo";
import { t } from "@/messages/en";
import { ReviewDialog } from "./review-dialog";
import { TicketCard } from "./ticket-card";

const TABS = ["tickets", "bookings", "hire", "reviews", "saved", "activity"] as const;
type Tab = (typeof TABS)[number];

export function MeView() {
  const me = useMe();
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("tickets").withOptions({ history: "replace", scroll: false }),
  );

  if (me.isPending) {
    return (
      <Wrap>
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </Wrap>
    );
  }
  if (me.isError) {
    return (
      <Wrap>
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      </Wrap>
    );
  }

  const { user, progress } = me.data;
  if (!user) {
    return (
      <Wrap>
        <h1 className="font-display text-display-lg">{t.me.title}</h1>
        <EmptyState
          title={t.me.explorerTitle}
          body={t.me.explorerBody}
          action={
            <Button asChild size="lg">
              <Link href="/onboarding">{t.nav.signUp}</Link>
            </Button>
          }
        />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          {t.me.memberSince(formatDate(user.joinedAt, { weekday: undefined, day: undefined, year: "numeric" }))}
        </p>
        <h1 className="font-display text-display-lg">{user.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Chip tone={progress.level === "ambassador" ? "accent" : "default"}>{t.roleSwitcher.levels[progress.level]}</Chip>
          <Chip tone="quiet">{t.onboarding.memberships[user.membership].title}</Chip>
          <Chip tone="quiet">{user.city}</Chip>
        </div>
      </header>

      <LevelCard progress={progress} />

      <Tabs value={tab} onValueChange={(v) => void setTab(v as Tab)} className="flex flex-col gap-6">
        <TabsList label={t.me.title} value={tab} items={TABS.map((k) => ({ value: k, label: t.me.tabs[k] }))} />
        <TabsContent value="tickets">
          <OrdersTab kinds={["ticket"]} empty={t.me.ticketsEmpty} />
        </TabsContent>
        <TabsContent value="bookings">
          <OrdersTab kinds={["reservation", "slot", "hire"]} empty={t.me.bookingsEmpty} />
        </TabsContent>
        <TabsContent value="hire">
          <HireTab />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsTab />
        </TabsContent>
        <TabsContent value="saved">
          <SavedTab />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 pt-8 md:px-8 md:pt-12">{children}</div>;
}

function LevelCard({ progress: p }: { progress: LevelProgress }) {
  const unlock = useUnlockAmbassador();
  if (p.level === "ambassador") {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{t.me.unlocked}</p>
          <p className="text-sm text-muted">{t.ambassador.lockedBody}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/me/ambassador">
            {t.me.ambassadorLink}
            <ArrowRight />
          </Link>
        </Button>
      </Card>
    );
  }
  const rows = [
    {
      key: "attended",
      done: p.attended >= p.required.attended,
      label: t.me.requirement.attended(Math.min(p.attended, p.required.attended), p.required.attended),
    },
    {
      key: "reviews",
      done: p.reviews >= p.required.reviews,
      label: t.me.requirement.reviews(Math.min(p.reviews, p.required.reviews), p.required.reviews),
    },
    {
      key: "shares",
      done: p.shares >= p.required.shares,
      label: t.me.requirement.shares(Math.min(p.shares, p.required.shares), p.required.shares),
    },
  ];
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{t.me.levelProgress}</h2>
        <span className="text-sm text-muted tabular">{Math.round(p.ratio * 100)}%</span>
      </div>
      <Progress value={p.ratio} label={t.me.levelProgress} />
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden="true"
              className={`grid size-5 place-items-center rounded-full ${r.done ? "bg-accent text-on-accent" : "border border-line-strong"}`}
            >
              {r.done ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <span className={r.done ? "text-ink" : "text-muted"}>{r.label}</span>
            <span className="sr-only">{r.done ? "Done" : "Not done yet"}</span>
          </li>
        ))}
      </ul>
      {p.pendingEarnings > 0 ? <p className="text-sm text-ink">{t.ambassador.waiting(tsh(p.pendingEarnings))}</p> : null}
      <div>
        <Button
          disabled={!p.canUnlock || unlock.isPending}
          onClick={async () => {
            try {
              await unlock.mutateAsync();
              toast.success(t.me.unlocked);
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
        >
          {t.me.unlock}
        </Button>
      </div>
    </Card>
  );
}

function OrdersTab({ kinds, empty }: { kinds: MyOrder["kind"][]; empty: string }) {
  const orders = useMyOrders();
  if (orders.isPending) return <ListSkeleton />;
  if (orders.isError) return <ErrorState error={orders.error} onRetry={() => orders.refetch()} />;
  const list = orders.data.filter((o) => kinds.includes(o.kind));
  if (!list.length) {
    return (
      <EmptyState
        body={empty}
        action={
          <Button asChild variant="outline">
            <Link href="/explore">{t.nav.explore}</Link>
          </Button>
        }
      />
    );
  }
  const cutoff = Date.now() - 6 * 3_600_000;
  const upcoming = list.filter((o) => new Date(o.scheduledFor ?? o.createdAt).getTime() >= cutoff).reverse();
  const past = list.filter((o) => new Date(o.scheduledFor ?? o.createdAt).getTime() < cutoff);
  return (
    <div className="flex flex-col gap-8">
      {upcoming.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-muted">{t.me.upcoming}</h2>
          {upcoming.map((o) => (
            <TicketCard key={o.id} order={o} />
          ))}
        </section>
      ) : null}
      {past.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-muted">{t.me.past}</h2>
          {past.slice(0, 20).map((o) => (
            <TicketCard key={o.id} order={o} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function HireTab() {
  const hire = useMyHireRequests();
  if (hire.isPending) return <ListSkeleton />;
  if (hire.isError) return <ErrorState error={hire.error} onRetry={() => hire.refetch()} />;
  if (!hire.data.length) {
    return (
      <EmptyState
        body={t.me.hireEmpty}
        action={
          <Button asChild variant="outline">
            <Link href="/explore?type=professional">{t.types.professional.many}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {hire.data.map((h) => (
        <HireCard key={h.id} hire={h} showListing />
      ))}
    </div>
  );
}

function ReviewsTab() {
  const reviewable = useReviewable();
  const mine = useMyReviews();
  if (reviewable.isPending || mine.isPending) return <ListSkeleton />;
  if (reviewable.isError) return <ErrorState error={reviewable.error} onRetry={() => reviewable.refetch()} />;
  if (mine.isError) return <ErrorState error={mine.error} onRetry={() => mine.refetch()} />;
  if (!reviewable.data.length && !mine.data.length) return <EmptyState body={t.me.reviewsEmpty} />;
  return (
    <div className="flex flex-col gap-8">
      {reviewable.data.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-muted">{t.me.toReview}</h2>
          {reviewable.data.map((r) => (
            <Card key={r.orderId} className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Link href={`/a/${r.slug}`} className="font-semibold hover:underline">
                  {r.title}
                </Link>
                <p className="text-sm text-muted">Attended {formatDate(r.attendedAt)}</p>
              </div>
              <ReviewDialog orderId={r.orderId} title={r.title} />
            </Card>
          ))}
        </section>
      ) : null}
      {mine.data.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm text-muted">{t.me.yourReviews}</h2>
          {mine.data.map((r) => (
            <article key={r.id} className="flex flex-col gap-2 rounded-card border border-line p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/a/${r.slug}`} className="font-medium hover:underline">
                  {r.title}
                </Link>
                <Rating value={r.rating} size="sm" />
              </div>
              <p className="text-ink/90">{r.text}</p>
              <p className="text-xs text-muted">{formatDate(r.at)}</p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function SavedTab() {
  const saved = useSaved();
  if (saved.isPending) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        <ActivationCardSkeleton />
        <ActivationCardSkeleton />
      </div>
    );
  }
  if (saved.isError) return <ErrorState error={saved.error} onRetry={() => saved.refetch()} />;
  if (!saved.data.length) return <EmptyState icon={<Heart />} body={t.me.savedEmpty} />;
  return (
    <ul className="grid gap-x-5 gap-y-9 sm:grid-cols-2">
      {saved.data.map((c) => (
        <li key={c.activation.id}>
          <ActivationCard card={c} />
        </li>
      ))}
    </ul>
  );
}

const ACTIVITY_ICON = { share: Share2, checkin: Check, save: Heart } as const;

function ActivityTab() {
  const activity = useActivity();
  if (activity.isPending) return <ListSkeleton />;
  if (activity.isError) return <ErrorState error={activity.error} onRetry={() => activity.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Eye className="size-4" aria-hidden="true" />
        {t.me.activityNote}
      </p>
      {activity.data.length ? (
        <ul className="flex flex-col divide-y divide-line">
          {activity.data.map((a) => {
            const Icon = ACTIVITY_ICON[a.kind];
            return (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface">
                  <Icon className="size-4 text-muted" aria-hidden="true" />
                </span>
                <p className="flex-1 text-sm">
                  {t.me.activityVerbs[a.kind]}{" "}
                  <Link href={`/a/${a.slug}`} className="text-ink hover:underline">
                    {a.title}
                  </Link>
                </p>
                <span className="shrink-0 text-xs text-muted">{relativeTime(a.at)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState body={t.me.activityEmpty} />
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
