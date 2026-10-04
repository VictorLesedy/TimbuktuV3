import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Holds a Poster's place while its listing loads: the 4:5 photo, then the line of facts under it. */
export function PosterSkeleton() {
    return (
        <div aria-hidden="true">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <div className="mt-3 flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-16" />
            </div>
        </div>
    );
}

/**
 * A grid of poster skeletons in the same columns as the real grid, for anything that waits
 * on the server, e.g. `<Deferred data="listings" fallback={<PosterGridSkeleton />}>` or
 * `<WhenVisible data="more" fallback={<PosterGridSkeleton count={4} />}>` from Inertia.
 */
export function PosterGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
    return (
        <ul className={cn('grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4', className)} aria-busy="true" aria-label="Loading listings">
            {Array.from({ length: count }, (_, i) => (
                <li key={i}>
                    <PosterSkeleton />
                </li>
            ))}
        </ul>
    );
}

/** Holds an event page's place: badges, title, when and where, the photo, and the tickets card beside it. */
export function EventSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading the event" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-x-12">
            <div className="space-y-4">
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-14 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="mt-4 aspect-video w-full rounded-2xl" />
            </div>
            <Skeleton className="h-[26rem] rounded-xl lg:col-start-2 lg:row-start-1" />
        </div>
    );
}
