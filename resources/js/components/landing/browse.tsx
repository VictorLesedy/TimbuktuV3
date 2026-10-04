import { Container } from '@/components/container';
import { EmptyState } from '@/components/empty-state';
import { ActiveFilters, FilterBar, Poster } from '@/components/listing/filters';
import { Button } from '@/components/ui/button';
import { EMPTY_FILTERS, exploreHref, filterListings, type BrowseFilters } from '@/lib/browse';
import type { Signals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types';
import { ArrowRightIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export { Poster };

const PAGE = 8;

/**
 * Browse on the home page: everything that is on, filterable right here by kind, city,
 * day, price and the day a place is busiest, before anyone needs the Explore page.
 */
export function Browse({ listings, signals, underCurtain = false }: { listings: Listing[]; signals: Map<string, Signals>; underCurtain?: boolean }) {
    const [f, setF] = useState<BrowseFilters>(EMPTY_FILTERS);
    const [shown, setShown] = useState(PAGE);
    const set = (patch: Partial<BrowseFilters>) => {
        setF((prev) => ({ ...prev, ...patch }));
        setShown(PAGE);
    };
    const results = useMemo(() => filterListings(listings, signals, f), [listings, signals, f]);

    return (
        <section
            id={underCurtain ? undefined : 'browse'}
            data-tone="light"
            className={cn(
                'scroll-mt-16 bg-gray-50 py-20 text-navy-900 md:py-28',
                // Holds at the top while the curtain opens on it (its wrapper sets how long).
                underCurtain && 'sticky top-0',
            )}
        >
            <Container>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="font-display text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1]">What’s on.</h2>
                        <p className="mt-3 max-w-[52ch] text-gray-600">Events, venues, tours and talent to hire across Tanzania. Sample listings while launch partners are signed.</p>
                    </div>
                    <Button asChild size="lg" className="self-start md:self-auto">
                        <Link href={exploreHref(f)}>
                            Open in Explore
                            <ArrowRightIcon aria-hidden="true" />
                        </Link>
                    </Button>
                </div>

                {/* The filters stay in reach under the header while the grid scrolls. */}
                <FilterBar f={f} set={set} className="sticky top-16 z-20 -mx-4 mt-10 border-b bg-gray-50 px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" />
                <ActiveFilters f={f} set={set} count={results.length} className="mt-6" />

                {results.length === 0 ? (
                    <EmptyState
                        icon={MagnifyingGlassIcon}
                        title="Nothing matches yet"
                        body="Try another day or city, or clear the filters to see everything."
                        className="mt-6 bg-white"
                        action={
                            <Button variant="outline" onClick={() => set(EMPTY_FILTERS)}>
                                Clear filters
                            </Button>
                        }
                    />
                ) : (
                    <ul className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                        {results.slice(0, shown).map((l) => (
                            <li key={l.id}>
                                <Poster listing={l} />
                            </li>
                        ))}
                    </ul>
                )}

                {results.length > shown && (
                    <div className="mt-12 flex flex-wrap items-center gap-4">
                        <Button size="lg" onClick={() => setShown((n) => n + PAGE)}>
                            Show {Math.min(PAGE, results.length - shown)} more
                        </Button>
                        <span className="text-sm text-gray-600">
                            Showing {shown} of {results.length}
                        </span>
                    </div>
                )}
            </Container>
        </section>
    );
}
