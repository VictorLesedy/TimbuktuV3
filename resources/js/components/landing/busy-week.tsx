import { Container } from '@/components/container';
import { Photo } from '@/components/listing/photo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DAY_NAMES, DAY_SHORT } from '@/lib/format';
import { listingUrl } from '@/lib/kinds';
import { BANDS, type Signals } from '@/lib/signals';
import type { Listing } from '@/types';
import { ArrowRightIcon, StarIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Kuna watu: pick a day, see where people usually go that day and at what time, worked
 * out from twelve weeks of check-ins. The day picker is the same filter Explore uses.
 */
export function BusyWeek({ listings, signals }: { listings: Listing[]; signals: Map<string, Signals> }) {
    const today = new Date().getDay();
    const [day, setDay] = useState(today);
    const top = useMemo(
        () =>
            listings
                .filter((l) => l.kind !== 'professional' && !l.venue?.closedOn.includes(day))
                .map((l) => ({ l, s: signals.get(l.id)!, n: signals.get(l.id)?.dayTotals[day] ?? 0 }))
                .filter((x) => x.n > 0)
                .sort((a, b) => b.n - a.n)
                .slice(0, 4),
        [listings, signals, day],
    );

    return (
        <section data-tone="dark" className="bg-navy-900 py-24 text-white md:py-32">
            <Container>
                <h2 data-reveal-lines className="max-w-[14ch] font-display text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1]">
                    Know where the crowd goes, before you go.
                </h2>
                <p className="mt-6 max-w-[46ch] text-lg text-peri-100">
                    Every place shows when it usually fills up, worked out from real check-ins. Ratings come only from guests who were scanned in at the door.
                </p>

                <ToggleGroup
                    type="single"
                    value={String(day)}
                    onValueChange={(v) => v && setDay(Number(v))}
                    aria-label="Day of the week"
                    spacing={3}
                    className="mt-14 w-full overflow-x-auto pb-2 scrollbar-none"
                >
                    {ORDER.map((d) => (
                        <ToggleGroupItem
                            key={d}
                            value={String(d)}
                            aria-label={DAY_NAMES[d]}
                            className="size-[4.5rem] flex-col gap-0 rounded-full text-white ring-1 ring-white/25 hover:bg-white/10 hover:text-white data-[state=on]:bg-peri-300 data-[state=on]:text-on-peri data-[state=on]:ring-peri-300 sm:size-24"
                        >
                            <span className="font-display text-xl sm:text-2xl">{DAY_SHORT[d]}</span>
                            <span className="text-[0.7rem] opacity-70">{d === today ? 'today' : ' '}</span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>

                <ul className="mt-12 grid gap-5 md:grid-cols-2">
                    {top.map(({ l, s }, i) => (
                        <li key={l.id}>
                            <Link href={listingUrl(l)} className="group block rounded-[1.75rem]">
                                <Card className="flex-row gap-5 rounded-[1.75rem] bg-navy-800 p-4 text-white ring-white/10 transition-colors duration-200 group-hover:bg-navy-700">
                                    <Photo photo={l.photos[0]!} width={300} ratio={1} className="size-28 shrink-0 rounded-2xl sm:size-32" sizes="128px" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-peri-200">
                                            Number {i + 1} on {DAY_NAMES[day]}s, {l.area}
                                        </p>
                                        <p className="truncate font-display text-3xl leading-[1.1]">{l.title}</p>
                                        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label={`When ${l.title} is busy on ${DAY_NAMES[day]}s`}>
                                            {BANDS.map((b, bi) => {
                                                const v = s.rhythm[day]![bi]!;
                                                return (
                                                    <span key={b} className="text-center">
                                                        <span className="block h-8 rounded-lg bg-peri-300" style={{ opacity: v === 0 ? 0.1 : 0.22 + v * 0.78 }} />
                                                        <span className="mt-1 block text-[0.7rem] text-peri-200">{b}</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        {s.rating.count > 0 && (
                                            <p className="mt-3 flex items-center gap-1 text-sm">
                                                <StarIcon className="size-4 text-peri-300" aria-hidden="true" />
                                                <span className="font-semibold tabular">{s.rating.average.toFixed(1)}</span>
                                                <span className="text-peri-200">from {s.rating.count} scanned-in guests</span>
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            </Link>
                        </li>
                    ))}
                </ul>
                <Button asChild variant="light" size="lg" className="mt-10">
                    <Link href={`/explore?busy=${day}`}>
                        Everything busy on {DAY_NAMES[day]}s
                        <ArrowRightIcon aria-hidden="true" />
                    </Link>
                </Button>
            </Container>
        </section>
    );
}
