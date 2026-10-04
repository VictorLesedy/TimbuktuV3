import { Photo } from '@/components/listing/photo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { eventSold, serviceBooked, venueBooked } from '@/lib/cart';
import { DAY, DAY_SHORT, isoDay, startOfDay, tsh } from '@/lib/format';
import { KIND_INFO, listingUrl } from '@/lib/kinds';
import { busynessOn, type Signals } from '@/lib/signals';
import { useApp } from '@/store/app-store';
import type { Kind, Listing } from '@/types';
import { ArrowUpRightIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from './motion';

function Row({ label, sub, value }: { label: string; sub?: string; value: string }) {
    return (
        <li className="flex items-baseline justify-between gap-4 py-3">
            <span className="min-w-0">
                <span className="block font-semibold">{label}</span>
                {sub && <span className="block truncate text-sm text-peri-200">{sub}</span>}
            </span>
            <span className="shrink-0 font-display text-xl text-peri-200 tabular">{value}</span>
        </li>
    );
}

function Panel({ kind, listing, children }: { kind: Kind; listing: Listing; children: ReactNode }) {
    const info = KIND_INFO[kind];
    return (
        <Card className="relative h-[min(78dvh,44rem)] w-[min(86vw,40rem)] shrink-0 justify-end gap-0 overflow-hidden rounded-[2rem] bg-navy-900 p-6 text-white ring-0 md:p-9">
            <Photo photo={listing.photos[0]!} width={1000} ratio={4 / 5} eager className="absolute! inset-0 aspect-auto! size-full" sizes="40rem" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--b-950)_15%,transparent)_0%,color-mix(in_oklab,var(--b-950)_55%,transparent)_40%,color-mix(in_oklab,var(--b-950)_96%,transparent)_75%)]" aria-hidden="true" />
            <div className="relative space-y-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-peri-200">
                    <info.icon className="size-5" aria-hidden="true" />
                    {info.plural}
                </p>
                <h3 className="font-display text-4xl md:text-5xl">{info.how}</h3>
                <p className="text-peri-100">
                    For example, {listing.title} in {listing.area}:
                </p>
                <ul className="divide-y divide-white/15">{children}</ul>
                <Button asChild variant="light" size="lg" className="h-12 px-6 text-base">
                    <Link href={listingUrl(listing)}>
                        {info.verb}
                        <ArrowUpRightIcon aria-hidden="true" />
                    </Link>
                </Button>
            </div>
        </Card>
    );
}

/**
 * Bei gani, in detail: four kinds of listing, each booked its own way, passing sideways
 * while the page holds still. Phones swipe the same panels instead.
 */
export function FourWays({ event, venue, service, pro, signals }: { event?: Listing; venue?: Listing; service?: Listing; pro?: Listing; signals: Map<string, Signals> }) {
    const wrap = useRef<HTMLElement>(null);
    const track = useRef<HTMLDivElement>(null);
    const orders = useApp((s) => s.orders);
    const today = startOfDay(Date.now());

    useLayoutEffect(() => {
        const w = wrap.current;
        const t = track.current;
        if (!w || !t) return;
        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
            const distance = () => t.scrollWidth - window.innerWidth;
            gsap.to(t, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: { trigger: w, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
            });
        });
        return () => mm.revert();
    }, []);

    const vs = venue ? signals.get(venue.id) : undefined;

    return (
        <section ref={wrap} data-tone="light" className="relative overflow-hidden bg-gray-50 text-navy-900">
            <div ref={track} className="flex snap-x snap-mandatory items-center gap-6 overflow-x-auto py-24 pr-4 pl-4 scrollbar-none sm:pr-6 sm:pl-6 lg:h-[100dvh] lg:snap-none lg:overflow-visible lg:py-0 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                <div className="w-[min(86vw,30rem)] shrink-0 snap-start space-y-6 lg:pr-10">
                    <h2 data-reveal-lines className="font-display text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1]">
                        Four ways to book, each shaped to the offer.
                    </h2>
                    <p className="max-w-[34ch] text-lg text-gray-600">A concert sells tickets. A rooftop takes a table deposit. A tour sells a time. A DJ sends a quote. Every price is in shillings, before you pick.</p>
                </div>
                {event?.event && (
                    <div className="snap-start">
                        <Panel kind="event" listing={event}>
                            {event.event.tiers.map((tier) => (
                                <Row key={tier.id} label={tier.name} sub={`${tier.capacity - eventSold(orders, event, tier.name)} left · ${tier.includes}`} value={tsh(tier.price)} />
                            ))}
                        </Panel>
                    </div>
                )}
                {venue?.venue && vs && (
                    <div className="snap-start">
                        <Panel kind="venue" listing={venue}>
                            {[0, 1, 2].map((d) => {
                                const day = new Date(today.getTime() + d * DAY);
                                const closed = venue.venue!.closedOn.includes(day.getDay());
                                const table = venue.venue!.options[1] ?? venue.venue!.options[0]!;
                                const left = table.perDay - venueBooked(orders, venue, table.name, isoDay(day));
                                return (
                                    <Row
                                        key={d}
                                        label={`${d === 0 ? 'Tonight' : DAY_SHORT[day.getDay()]}, ${table.name.toLowerCase()}`}
                                        sub={closed ? 'Closed' : `Usually ${busynessOn(vs, day.getDay()).toLowerCase()} · ${left} left`}
                                        value={closed ? '-' : `${tsh(table.deposit)} deposit`}
                                    />
                                );
                            })}
                        </Panel>
                    </div>
                )}
                {service?.service && (
                    <div className="snap-start">
                        <Panel kind="service" listing={service}>
                            {service.service.times.map((time) => (
                                <Row
                                    key={time}
                                    label={`Tomorrow, ${time}`}
                                    sub={`${service.service!.capacity - serviceBooked(orders, service, isoDay(today.getTime() + DAY), time)} places left · up to ${service.service!.maxGroup} per booking`}
                                    value={`${tsh(service.service!.pricePerPerson)} pp`}
                                />
                            ))}
                        </Panel>
                    </div>
                )}
                {pro?.professional && (
                    <div className="snap-start lg:pr-[10vw]">
                        <Panel kind="professional" listing={pro}>
                            <Row label="You ask" sub="Date, place, hours and your budget" value="Free" />
                            <Row label="They quote" sub={`Usually within ${pro.professional.responseHours} hours, with terms`} value={`from ${tsh(pro.professional.rateFrom)}`} />
                            <Row label="You accept and pay" sub="Online; both of you see each step" value="Pay online" />
                        </Panel>
                    </div>
                )}
            </div>
        </section>
    );
}
