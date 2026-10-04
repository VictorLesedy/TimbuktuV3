import { Container } from '@/components/container';
import { EmptyState } from '@/components/empty-state';
import { ActiveFilters, FilterBar, Poster } from '@/components/listing/filters';
import { PosterGridSkeleton } from '@/components/listing/skeletons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHydrated } from '@/hooks/use-hydrated';
import { EMPTY_FILTERS, filterListings, PRICE_STEPS, type BrowseFilters, type Sort, type When } from '@/lib/browse';
import { useSignals } from '@/lib/signals';
import { useQuery, useSetQuery } from '@/lib/url-state';
import { useApp } from '@/store/app-store';
import { KINDS, type Kind } from '@/types';
import { LinkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const PAGE = 12;
const WHENS: When[] = ['any', 'today', 'tomorrow', 'weekend'];
const SORTS: Sort[] = ['soonest', 'trending', 'rating', 'nearest', 'newest'];
const LAST = PRICE_STEPS.at(-1)!;

/** The filters as they sit in the address bar, so a link opens exactly this search for a friend. */
function useUrlFilters(): [BrowseFilters, (patch: Partial<BrowseFilters>) => void] {
    const query = useQuery();
    const setQuery = useSetQuery();
    const kind = query.get('kind') as Kind | null;
    const when = query.get('when') as When | null;
    const sort = query.get('sort') as Sort | null;
    const busy = query.get('busy');
    const f: BrowseFilters = {
        q: query.get('q') ?? '',
        kind: kind && KINDS.includes(kind) ? kind : null,
        city: query.get('city') ?? '',
        when: when && WHENS.includes(when) ? when : 'any',
        date: query.get('date') ?? '',
        min: Number(query.get('min') ?? 0),
        max: Number(query.get('max') ?? LAST),
        busy: busy === null || busy === '' ? null : Number(busy),
        sort: sort && SORTS.includes(sort) ? sort : 'soonest',
    };
    const set = (patch: Partial<BrowseFilters>) => {
        const out: Record<string, string | null> = {};
        if ('q' in patch) out.q = patch.q?.trim() || null;
        if ('kind' in patch) out.kind = patch.kind ?? null;
        if ('city' in patch) out.city = patch.city || null;
        if ('when' in patch) out.when = patch.when === 'any' ? null : (patch.when ?? null);
        if ('date' in patch) out.date = patch.date || null;
        if ('min' in patch) out.min = patch.min ? String(patch.min) : null;
        if ('max' in patch) out.max = patch.max !== undefined && patch.max < LAST ? String(patch.max) : null;
        if ('busy' in patch) out.busy = patch.busy === null || patch.busy === undefined ? null : String(patch.busy);
        if ('sort' in patch) out.sort = patch.sort === 'soonest' ? null : (patch.sort ?? null);
        setQuery(out);
    };
    return [f, set];
}

export default function Explore() {
    const listings = useApp((s) => s.listings);
    const signals = useSignals();
    const hydrated = useHydrated();
    const [url, setUrl] = useUrlFilters();
    const [shown, setShown] = useState(PAGE);

    // Typing updates the link after a pause, so the address bar does not churn on every key.
    const [text, setText] = useState(url.q);
    useEffect(() => setText(url.q), [url.q]);
    useEffect(() => {
        if (text === url.q) return;
        const t = setTimeout(() => setUrl({ q: text }), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);

    const f = { ...url, q: text };
    const set = (patch: Partial<BrowseFilters>) => {
        if ('q' in patch) setText(patch.q ?? '');
        const { q: _q, ...rest } = patch;
        if (Object.keys(rest).length) setUrl('q' in patch ? { ...rest, q: patch.q } : rest);
        setShown(PAGE);
    };
    const results = useMemo(() => filterListings(listings, signals, url), [listings, signals, url]);

    const share = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied', { description: 'Paste it in WhatsApp; it opens this exact search.' });
        } catch {
            toast.error('Could not copy the link');
        }
    };

    return (
        <>
            <Head title="Explore" />
            <Container className="py-8 md:py-12">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-1">
                        <h1 className="font-display text-3xl md:text-4xl">Explore</h1>
                        <p className="text-muted-foreground">Events, venues, services and talent to hire across Tanzania.</p>
                    </div>
                    <Button variant="outline" onClick={share} className="self-start md:self-auto">
                        <LinkIcon />
                        Copy link to this search
                    </Button>
                </div>

                {/* The filters stay in reach under the header while the grid scrolls. */}
                <FilterBar f={f} set={set} className="sticky top-16 z-20 -mx-4 mt-8 border-b bg-background px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" />

                {!hydrated ? (
                    <div aria-busy="true">
                        <Skeleton className="mt-6 h-7 w-28" />
                        <PosterGridSkeleton className="mt-6" />
                    </div>
                ) : (
                    <>
                        <ActiveFilters f={f} set={set} count={results.length} className="mt-6" />
                        {results.length === 0 ? (
                            <EmptyState
                                icon={MagnifyingGlassIcon}
                                title="Nothing matches yet"
                                body="Try another day or city, or clear the filters to see everything."
                                className="mt-6"
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
                                <span className="text-sm text-muted-foreground">
                                    Showing {shown} of {results.length}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </Container>
        </>
    );
}
