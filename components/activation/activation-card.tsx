import { Star } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/ui/misc";
import { LiveDot } from "@/components/ui/signals";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate, formatTime, tsh } from "@/lib/format";
import type { ActivationCard as Card } from "@/lib/repo";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

function Meta({ card }: { card: Card }) {
  const a = card.activation;
  const when = card.nextDate ? `${formatDate(card.nextDate)}, ${formatTime(card.nextDate)}` : null;
  return (
    <p className="truncate text-sm text-muted">
      {when ?? `${a.location.area}, ${a.city}`}
      {card.distanceKm !== null && card.activation.city !== "Zanzibar" && card.distanceKm < 60 ? (
        <span className="sr-only">. {t.common.km(card.distanceKm)}</span>
      ) : null}
    </p>
  );
}

function Badges({ card, max = 2 }: { card: Card; max?: number }) {
  const shown = card.badges.slice(0, max);
  if (!shown.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((b) => (
        <li key={b.id}>
          <Chip tone={b.live ? "live" : b.id === "new" ? "accent" : "quiet"}>{b.label}</Chip>
        </li>
      ))}
    </ul>
  );
}

export function ActivationCard({
  card,
  layout = "grid",
  className,
  priority,
}: {
  card: Card;
  layout?: "grid" | "list";
  className?: string;
  priority?: boolean;
}) {
  const a = card.activation;
  const cover = a.media[0];
  const href = `/a/${a.slug}`;

  if (layout === "list") {
    return (
      <article className={cn("group relative flex gap-4 rounded-card p-2 transition-colors hover:bg-surface", className)}>
        {cover ? (
          <SmartImage src={cover.url} alt="" hue={cover.hue} sizes="112px" className="aspect-square w-24 shrink-0 rounded-2xl sm:w-28" />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
          <div className="flex items-center gap-2">
            {card.signals.busyNow ? <LiveDot label={t.living.busyNow} /> : null}
            <h3 className="truncate font-semibold text-ink">
              <Link href={href} className="after:absolute after:inset-0 after:rounded-card">
                {a.title}
              </Link>
            </h3>
          </div>
          <Meta card={card} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="text-ink">
              <span className="text-muted">{t.common.from} </span>
              {tsh(card.fromPrice)}
            </span>
            {card.signals.rating ? (
              <span className="inline-flex items-center gap-1 text-ink">
                <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
                <span className="tabular">{card.signals.rating.toFixed(1)}</span>
                <span className="sr-only">out of 5</span>
              </span>
            ) : null}
            <Badges card={card} max={1} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("group relative flex flex-col gap-3", className)}>
      <div className="relative">
        {cover ? (
          <SmartImage
            src={cover.url}
            alt=""
            hue={cover.hue}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 33vw, 80vw"
            priority={priority}
            className="aspect-[4/3] w-full rounded-card"
          />
        ) : (
          <div className="aspect-[4/3] w-full rounded-card bg-surface" />
        )}
        {card.signals.busyNow ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-canvas/80 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur">
            <LiveDot />
            {t.living.busyNow}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-semibold leading-snug text-ink">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-card">
              {a.title}
            </Link>
          </h3>
          {card.signals.rating ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm text-ink">
              <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
              <span className="tabular">{card.signals.rating.toFixed(1)}</span>
              <span className="sr-only">out of 5</span>
            </span>
          ) : null}
        </div>
        <Meta card={card} />
        <p className="text-sm text-ink">
          <span className="text-muted">{t.common.from} </span>
          {tsh(card.fromPrice)}
        </p>
        <div className="mt-1">
          <Badges card={card} />
        </div>
      </div>
    </article>
  );
}

export function ActivationCardSkeleton({ layout = "grid" }: { layout?: "grid" | "list" }) {
  const Skel = ({ className }: { className: string }) => (
    <div
      aria-hidden="true"
      className={cn(
        "animate-shimmer bg-[linear-gradient(90deg,var(--color-surface)_0%,var(--color-raised)_50%,var(--color-surface)_100%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
  if (layout === "list") {
    return (
      <div className="flex gap-4 p-2">
        <Skel className="aspect-square w-24 shrink-0 rounded-2xl sm:w-28" />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <Skel className="h-4 w-2/3 rounded-full" />
          <Skel className="h-3 w-1/2 rounded-full" />
          <Skel className="h-3 w-1/3 rounded-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Skel className="aspect-[4/3] w-full rounded-card" />
      <Skel className="h-4 w-3/4 rounded-full" />
      <Skel className="h-3 w-1/2 rounded-full" />
    </div>
  );
}
