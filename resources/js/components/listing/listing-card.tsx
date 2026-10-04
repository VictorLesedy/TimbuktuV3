import { tsh } from '@/lib/format';
import { KIND_INFO, listingUrl } from '@/lib/kinds';
import { priceFrom, useListingSignals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types';
import { StarIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { Photo } from './photo';
import { SignalBadge } from './signal-badge';

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short' });

export function Rating({ average, count, className }: { average: number; count: number; className?: string }) {
    if (!count) return <span className={cn('text-sm text-muted-foreground', className)}>No reviews yet</span>;
    return (
        <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
            <StarIcon className="size-4 text-live" aria-hidden="true" />
            <span className="font-semibold tabular">{average.toFixed(1)}</span>
            <span className="text-muted-foreground">
                ({count}
                <span className="sr-only"> verified reviews</span>)
            </span>
        </span>
    );
}

/** The date printed like a gig poster stub: day number large, month under it. */
function DateStub({ iso }: { iso: string }) {
    const d = new Date(iso);
    return (
        <span className="absolute top-3 left-3 flex w-14 flex-col items-center rounded-xl bg-lime py-1.5 text-night shadow-card">
            <span className="font-display text-3xl leading-none tabular">{d.getDate()}</span>
            <span className="text-xs font-semibold">{MONTH.format(d)}</span>
        </span>
    );
}

function priceNote(l: Listing) {
    if (l.kind === 'professional') return l.professional?.rateUnit ?? '';
    if (l.kind === 'service') return 'per person';
    return 'and up';
}

export function ListingCard({ listing, layout = 'poster', className }: { listing: Listing; layout?: 'poster' | 'list'; className?: string }) {
    const signals = useListingSignals(listing.id);
    const badge = signals?.badges[0];
    const price = priceFrom(listing);

    if (layout === 'list') {
        return (
            <Link href={listingUrl(listing)} className={cn('group flex items-center gap-4 rounded-2xl p-2 pr-4 transition-colors duration-200 hover:bg-secondary', className)}>
                <Photo photo={listing.photos[0]!} width={320} ratio={1} className="size-24 shrink-0 rounded-xl sm:size-28" sizes="112px" />
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground">
                        {KIND_INFO[listing.kind].label} · {listing.area}, {listing.city}
                    </p>
                    <h3 className="truncate font-display text-2xl">{listing.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold tabular">From {tsh(price)}</span>
                        {signals && signals.rating.count > 0 && <Rating average={signals.rating.average} count={signals.rating.count} />}
                        {badge && <SignalBadge badge={badge} />}
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link href={listingUrl(listing)} className={cn('group block space-y-3 rounded-[1.25rem]', className)}>
            <div className="relative overflow-hidden rounded-[1.25rem]">
                <Photo
                    photo={listing.photos[0]!}
                    width={560}
                    ratio={4 / 5}
                    imgClassName="transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 80vw"
                />
                {listing.event && <DateStub iso={listing.event.startsAt} />}
            </div>
            <div className="space-y-1.5 px-0.5">
                <h3 className="font-display text-[1.75rem] leading-[0.95]">{listing.title}</h3>
                <p className="truncate text-sm text-muted-foreground">
                    {listing.area}, {listing.city}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
                    <span className="text-sm">
                        <span className="font-semibold tabular">{tsh(price)}</span> <span className="text-muted-foreground">{priceNote(listing)}</span>
                    </span>
                    {signals && signals.rating.count > 0 && <Rating average={signals.rating.average} count={signals.rating.count} />}
                </div>
                {badge && <SignalBadge badge={badge} />}
            </div>
        </Link>
    );
}
