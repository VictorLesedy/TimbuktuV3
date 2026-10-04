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
