import Link from "next/link";
import { ActivationCard, ActivationCardSkeleton } from "@/components/activation/activation-card";
import { SectionHeading } from "@/components/ui/misc";
import type { ActivationCard as Card } from "@/lib/repo";
import { t } from "@/messages/en";

export function Rail({
  id,
  title,
  hint,
  cards,
  loading,
  href,
}: {
  id: string;
  title: string;
  hint?: string;
  cards?: Card[];
  loading?: boolean;
  href?: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <div className="mx-auto w-full max-w-[1280px] px-5 md:px-8">
        <SectionHeading
          id={id}
          title={title}
          hint={hint}
          action={
            href ? (
              <Link href={href} className="shrink-0 text-sm font-medium text-accent hover:underline">
                {t.common.seeAll}
              </Link>
            ) : undefined
          }
        />
      </div>
      <div className="mx-auto w-full max-w-[1280px]">
        {loading ? (
          <div className="scrollbar-none flex gap-4 overflow-hidden px-5 md:px-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-[72vw] max-w-[280px] shrink-0">
                <ActivationCardSkeleton />
              </div>
            ))}
          </div>
        ) : cards?.length ? (
          <ul className="scrollbar-none flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:scroll-px-8 md:px-8">
            {cards.map((c, i) => (
              <li key={c.activation.id} className="w-[72vw] max-w-[280px] shrink-0 snap-start">
                <ActivationCard card={c} priority={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 text-muted md:px-8">
            {t.home.emptyRail}{" "}
            <Link className="text-accent hover:underline" href="/explore">
              {t.nav.explore}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
