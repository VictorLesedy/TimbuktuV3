import { ListingDetail } from '@/components/listing/listing-detail';
import { useSignals } from '@/lib/signals';
import { useApp } from '@/store/app-store';
import { EyeSlashIcon } from '@heroicons/react/24/outline';
import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import NotFound from './not-found';

export default function ListingPage({ slug }: { slug: string }) {
    const listing = useApp((s) => s.listings.find((l) => l.slug === slug));
    const hosts = useApp((s) => s.hosts);
    const allReviews = useApp((s) => s.reviews);
    const session = useApp((s) => s.session);
    const signals = useSignals();
    const reviews = useMemo(() => allReviews.filter((r) => r.listingId === listing?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [allReviews, listing?.id]);

    // Listings that are not live are visible only to their owner and the Timbuktu team.
    const owner = listing && session.role === 'studio' && session.hostId === listing.hostId;
    if (!listing || (listing.status !== 'live' && !owner && session.role !== 'admin')) return <NotFound />;
    const host = hosts.find((h) => h.id === listing.hostId)!;

    return (
        <>
            <Head title={listing.title} />
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
                {listing.status !== 'live' && (
                    <p className="mb-6 flex items-center gap-2 rounded-xl bg-secondary p-4 text-sm">
                        <EyeSlashIcon className="size-5 shrink-0" aria-hidden="true" />
                        Fans cannot see this listing yet. Its status is {listing.status.replace('_', ' ')}.
                    </p>
                )}
                <ListingDetail listing={listing} host={host} signals={signals.get(listing.id)!} reviews={reviews} />
            </div>
        </>
    );
}
