import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatDate, formatDateTime, formatTime, initials } from '@/lib/format';
import { listingUrl } from '@/lib/kinds';
import { ended } from '@/lib/showcase';
import type { Signals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import type { Host, Listing, Review } from '@/types';
import { ArrowRightIcon, CalendarDaysIcon, CheckBadgeIcon, ClockIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';
import { Link } from '@inertiajs/react';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useRef, useState } from 'react';
import { BookingBox } from './booking-box';
import { Poster } from './filters';
import { Reviews, SaveShare } from './listing-detail';
import { Photo } from './photo';
import { SignalBadge } from './signal-badge';
import { SignalsPanel } from './signals-panel';

/**
 * The event's photos as a carousel that moves on by itself every five seconds. It pauses
 * while the pointer is over it, carries on after a swipe, and stays still for anyone who
 * asks for reduced motion. The thumbnails follow it and jump to a photo.
 */
function PhotoCarousel({ listing }: { listing: Listing }) {
    const photos = listing.photos;
    const reduced = useReducedMotion();
    const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }));
    const [api, setApi] = useState<CarouselApi>();
    const [index, setIndex] = useState(0);
    useEffect(() => {
        if (!api) return;
        const select = () => setIndex(api.selectedScrollSnap());
        select();
        api.on('select', select);
        return () => {
            api.off('select', select);
        };
    }, [api]);
    const many = photos.length > 1;

    return (
        <div className="space-y-3">
            <Carousel setApi={setApi} opts={{ loop: true }} plugins={many && !reduced ? [autoplay.current] : []} className="overflow-hidden rounded-2xl" aria-label="Photos">
                <CarouselContent className="ml-0">
                    {photos.map((p, i) => (
                        <CarouselItem key={p.src} className="pl-0">
                            <Photo photo={p} width={1400} ratio={16 / 9} eager={i === 0} sizes="(min-width: 1024px) 60vw, 100vw" />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {many && (
                    <>
                        <CarouselPrevious variant="secondary" className="left-3" />
                        <CarouselNext variant="secondary" className="right-3" />
                    </>
                )}
            </Carousel>
            {many && (
                <div className="flex gap-2" role="group" aria-label="Choose a photo">
                    {photos.map((p, i) => (
                        <button
                            key={p.src}
                            type="button"
                            onClick={() => api?.scrollTo(i)}
                            aria-label={`Photo ${i + 1}: ${p.alt}`}
                            aria-current={i === index}
                            className={cn(
                                'w-20 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-background transition-opacity duration-200 sm:w-24',
                                i === index ? 'ring-primary' : 'opacity-70 ring-transparent hover:opacity-100',
                            )}
                        >
                            <Photo photo={p} width={200} ratio={4 / 3} sizes="96px" />
                        </button>
                    ))}
                </div>
            )}
            <p className="text-xs text-muted-foreground">Photo: {photos[index]?.credit}, Unsplash</p>
        </div>
    );
}

/** A row of event posters under a heading, or nothing when there are none. */
function EventRow({ title, events }: { title: string; events: Listing[] }) {
    if (!events.length) return null;
    return (
        <section className="space-y-6">
            <h2 className="font-display text-3xl leading-[1] md:text-4xl">{title}</h2>
            <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {events.map((l) => (
                    <li key={l.id}>
                        <Poster listing={l} />
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** In place of tickets once the night is over: when it ran, and the way to the next one. */
function Ended({ listing, next }: { listing: Listing; next?: Listing }) {
    return (
        <div className="space-y-4">
            <p className="flex items-start gap-2 text-muted-foreground">
                <ClockIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                This event has ended. It ran on {formatDateTime(listing.event!.startsAt)}.
            </p>
            <Button asChild size="xl" className="w-full">
                <Link href={next ? listingUrl(next) : '/explore?kind=event'}>
                    {next ? 'See the next one' : 'See what’s on'}
                    <ArrowRightIcon aria-hidden="true" />
                </Link>
            </Button>
        </div>
    );
}

/** An event's page: what, when and where, the photos, then everything a fan needs to decide, with tickets in reach. */
export function EventDetail({
    listing,
    host,
    signals,
    reviews,
    related,
}: {
    listing: Listing;
    host: Host;
    signals: Signals;
    reviews: Review[];
    related: { upcoming: Listing[]; past: Listing[] };
}) {
    const ev = listing.event!;
    const over = ended(listing);
    return (
        <div className="space-y-20">
            {/* Phones read top to bottom: the event, the tickets, then the detail. Wide screens keep tickets beside it all. */}
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-x-12">
                <div className="min-w-0 space-y-8 lg:col-start-1">
                    <header className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                                <TicketIcon aria-hidden="true" />
                                Event
                            </Badge>
                            <Badge variant="outline">{listing.category}</Badge>
                            {signals.badges[0] && <SignalBadge badge={signals.badges[0]} />}
                        </div>
                        <h1 className="font-display text-[clamp(2.4rem,5vw,4.25rem)] leading-[1]">{listing.title}</h1>
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div className="space-y-1.5 text-muted-foreground">
                                <p className="flex items-center gap-2">
                                    <CalendarDaysIcon className="size-5 shrink-0" aria-hidden="true" />
                                    {formatDateTime(ev.startsAt)} to {formatTime(ev.endsAt)}
                                </p>
                                <p className="flex items-center gap-2">
                                    <MapPinIcon className="size-5 shrink-0" aria-hidden="true" />
                                    {ev.place}, {listing.city}
                                </p>
                            </div>
                            <SaveShare listing={listing} />
                        </div>
                    </header>
                    <PhotoCarousel listing={listing} />
                </div>

                <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start" aria-label="Tickets">
                    <Card className="gap-4 px-(--card-spacing) [--card-spacing:--spacing(6)]">
                        <h2 className="text-lg font-semibold">{over ? 'Tickets' : 'Buy tickets'}</h2>
                        {over ? <Ended listing={listing} next={related.upcoming.find((l) => l.hostId === listing.hostId)} /> : <BookingBox listing={listing} signals={signals} />}
                    </Card>
                </aside>

                <div className="min-w-0 space-y-10 lg:col-start-1">
                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold">About</h2>
                        <p className="text-lg">{listing.summary}</p>
                        <p className="max-w-prose text-muted-foreground">{listing.description}</p>
                    </section>
                    <Card className="flex-row items-start gap-4 px-(--card-spacing) [--card-spacing:--spacing(5)]">
                        <Avatar className="size-12">
                            <AvatarFallback className="bg-secondary font-semibold">{initials(host.name)}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h2 className="flex items-center gap-1.5 font-semibold">
                                Hosted by {host.name}
                                {host.verified && <CheckBadgeIcon className="size-5 fill-green-600 text-white" aria-label="Verified by Timbuktu" />}
                            </h2>
                            <p className="text-sm text-muted-foreground">{host.bio}</p>
                            <p className="text-sm text-muted-foreground">On Timbuktu since {formatDate(host.joinedAt)}</p>
                        </div>
                    </Card>
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold">Live signals</h2>
                        <Card className="px-(--card-spacing) [--card-spacing:--spacing(6)]">
                            <SignalsPanel signals={signals} />
                        </Card>
                    </section>
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold">Reviews from verified guests</h2>
                        <Reviews reviews={reviews} />
                    </section>
                </div>
            </div>
            <EventRow title="Upcoming events" events={related.upcoming} />
            <EventRow title="Past events" events={related.past} />
        </div>
    );
}
