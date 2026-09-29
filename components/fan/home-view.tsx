"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/misc";
import { ErrorState } from "@/components/ui/states";
import { DAYS } from "@/lib/config";
import { useHome } from "@/lib/queries";
import type { ActivationType } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { t } from "@/messages/en";
import { Hero } from "./hero";
import { Rail } from "./rail";

const KINDS: ActivationType[] = ["event", "venue", "service", "professional"];

export function HomeView() {
  const home = useHome();
  const city = useAppStore((s) => s.city);
  const data = home.data;
  const liveCount = data
    ? [...data.trending, ...data.busyToday, ...data.nearYou].filter(
        (c, i, all) => c.signals.busyNow && all.findIndex((x) => x.activation.id === c.activation.id) === i,
      ).length
    : null;

  return (
    <div className="flex flex-col gap-14 md:gap-20">
      <Hero liveCount={liveCount} />

      {home.isError ? (
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-8">
          <ErrorState error={home.error} onRetry={() => home.refetch()} />
        </div>
      ) : (
        <>
          <Rail
            id="rail-trending"
            title={t.home.trending}
            hint={t.home.trendingHint}
            cards={data?.trending}
            loading={home.isPending}
            href="/explore?sort=trending"
          />
          <Rail
            id="rail-busy"
            title={t.home.busyOn(data ? (DAYS[data.todayIndex] ?? null) : null)}
            hint={t.home.busyHint}
            cards={data?.busyToday}
            loading={home.isPending}
            href={data ? `/explore?vibe=${data.todayIndex}` : "/explore"}
          />

          <section aria-labelledby="browse-title" className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 md:px-8">
            <SectionHeading id="browse-title" title={t.home.browse} />
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {KINDS.map((k) => (
                <li key={k}>
                  <Link
                    href={`/explore?type=${k}`}
                    className="group flex h-full min-h-32 flex-col justify-between gap-6 rounded-card bg-surface p-4 transition-colors hover:bg-raised sm:p-5"
                  >
                    <span className="min-w-0 font-display text-[clamp(1.25rem,5.4vw,2.25rem)] leading-none text-ink [overflow-wrap:anywhere]">
                      {t.types[k].many}
                    </span>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm text-muted">{t.types[k].blurb}</span>
                        <span className="text-sm text-ink tabular">{data ? `${data.counts[k]} listed` : "\u00a0"}</span>
                      </div>
                      <ArrowUpRight className="size-5 shrink-0 text-muted transition-colors group-hover:text-accent" aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <Rail
            id="rail-near"
            title={t.home.nearYou}
            hint={t.home.nearHint(city)}
            cards={data?.nearYou}
            loading={home.isPending}
            href={`/explore?city=${encodeURIComponent(city)}&sort=top_rated`}
          />
        </>
      )}
    </div>
  );
}
