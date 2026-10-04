import { Container } from '@/components/container';
import { EventDetail } from '@/components/listing/event-detail';
import { EventSkeleton } from '@/components/listing/skeletons';
import { Todo } from '@/components/todo';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/hooks/use-hydrated';
import { relatedEvents } from '@/lib/showcase';
import { useSignals } from '@/lib/signals';
import { useApp } from '@/store/app-store';
import { ArrowLeftIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';
import NotFound from './not-found';

export default function ListingPage({ slug }: { slug: string }) {
    const hydrated = useHydrated();
    const listings = useApp((s) => s.listings);
    const listing = useMemo(() => listings.find((l) => l.slug === slug), [listings, slug]);
    const hosts = useApp((s) => s.hosts);
    const allReviews = useApp((s) => s.reviews);
    const session = useApp((s) => s.session);
    const signals = useSignals();
    const reviews = useMemo(() => allReviews.filter((r) => r.listingId === listing?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [allReviews, listing?.id]);
    const related = useMemo(() => (listing ? relatedEvents(listings, listing) : { upcoming: [], past: [] }), [listings, listing]);

    if (!hydrated) {
        return (
            <Container className="py-8 md:py-12">
                <EventSkeleton />
            </Container>
        );
    }
    // Listings that are not live are visible only to their owner and the Timbuktu team.
    const owner = listing && session.role === 'studio' && session.hostId === listing.hostId;
    if (!listing || (listing.status !== 'live' && !owner && session.role !== 'admin')) return <NotFound />;
    // Only events have their page so far; venues, services and professionals come next.
    if (listing.kind !== 'event') return <Todo title={listing.title} />;
    const host = hosts.find((h) => h.id === listing.hostId)!;

    return (
        <>
            <Head title={listing.title} />
            <Container className="py-6 md:py-10">
                <Button asChild variant="ghost" size="sm" className="-ml-2.5 mb-6">
                    <Link href="/explore?kind=event">
                        <ArrowLeftIcon aria-hidden="true" />
                        Events
                    </Link>
                </Button>
                {listing.status !== 'live' && (
                    <p className="mb-6 flex items-center gap-2 rounded-xl bg-secondary p-4 text-sm">
                        <EyeSlashIcon className="size-5 shrink-0" aria-hidden="true" />
                        Fans cannot see this listing yet. Its status is {listing.status.replace('_', ' ')}.
                    </p>
                )}
                <EventDetail listing={listing} host={host} signals={signals.get(listing.id)!} reviews={reviews} related={related} />
            </Container>
        </>
    );
}
