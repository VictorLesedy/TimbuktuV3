import { Container } from '@/components/container';
import { EmptyState } from '@/components/empty-state';
import { Photo } from '@/components/listing/photo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EMPTY_FILTERS, exploreHref, filterListings, PRICE_STEPS, type BrowseFilters, type Sort, type When } from '@/lib/browse';
import { DAY_NAMES, formatTime, tsh } from '@/lib/format';
import { KIND_INFO, listingUrl } from '@/lib/kinds';
import { priceFrom, type Signals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import { CITIES, KINDS, type Listing } from '@/types';
import { AdjustmentsHorizontalIcon, ArrowRightIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const PAGE = 8;
const ALL = 'all';
const WHEN: { id: When; label: string }[] = [
    { id: 'any', label: 'Any time' },
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'weekend', label: 'This weekend' },
];
const SORTS: { id: Sort; label: string }[] = [
    { id: 'soonest', label: 'Soonest' },
    { id: 'trending', label: 'Trending' },
    { id: 'rating', label: 'Top rated' },
    { id: 'nearest', label: 'Nearest' },
    { id: 'newest', label: 'Newest' },
];

/** One listing as a poster: the photo carries the title, the facts sit underneath. */
export function Poster({ listing }: { listing: Listing }) {
    const when = listing.event?.startsAt;
    const note = listing.kind === 'professional' ? listing.professional?.rateUnit : listing.kind === 'service' ? 'per person' : '';
    return (
        <Link href={listingUrl(listing)} className="group block rounded-2xl">
            <Card className="relative gap-0 rounded-2xl bg-navy-900 py-0 ring-0">
                <Photo
                    photo={listing.photos[0]!}
                    width={600}
                    ratio={4 / 5}
                    imgClassName="transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                    sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 92vw"
                />
                <div
                    className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--b-950)_55%,transparent)_0%,transparent_30%,transparent_50%,color-mix(in_oklab,var(--b-950)_92%,transparent)_100%)]"
                    aria-hidden="true"
                />
                <p className="absolute top-4 left-4 text-sm font-semibold text-white">{when ? DATE.format(new Date(when)) : KIND_INFO[listing.kind].label}</p>
                <h3 className="absolute right-4 bottom-4 left-4 font-display text-[1.9rem] leading-[1] text-white">{listing.title}</h3>
            </Card>
            <div className="mt-3 flex items-baseline justify-between gap-3">
                <p className="truncate text-sm text-gray-600">
                    {listing.event ? `${listing.event.place}, ${formatTime(listing.event.startsAt)}` : `${listing.area}, ${listing.city}`}
                </p>
                <p className="shrink-0 text-sm">
                    <span className="font-semibold tabular">{tsh(priceFrom(listing))}</span>
                    {note && <span className="text-gray-600"> {note}</span>}
                </p>
            </div>
        </Link>
    );
}

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
    const active = f.q || f.kind || f.city || f.when !== 'any' || f.busy !== null || f.min > 0 || f.max < PRICE_STEPS.at(-1)!;
    const priceLabel = f.min > 0 || f.max < PRICE_STEPS.at(-1)! ? `${tsh(f.min)} to ${tsh(f.max)}` : 'Any price';

    return (
        <section
            id="browse"
            data-tone="light"
            className={cn(
                'scroll-mt-16 bg-gray-50 py-20 text-navy-900 md:py-28',
                // Slides in under the hero's pinned frame, so the curtains open straight onto it.
                underCurtain && 'relative z-0 -mt-[100dvh] before:absolute before:inset-x-0 before:bottom-full before:h-[100dvh] before:bg-gray-50',
            )}
        >
            <Container>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="font-display text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1]">What’s on.</h2>
                        <p className="mt-3 max-w-[52ch] text-gray-600">Events, venues, tours and talent to hire across Tanzania. Sample listings while launch partners are signed.</p>
                    </div>
                    <Button asChild variant="link" className="self-start px-0 text-base font-semibold text-navy-900 md:self-auto">
                        <Link href={exploreHref(f)}>
                            Open in Explore
                            <ArrowRightIcon aria-hidden="true" />
                        </Link>
                    </Button>
                </div>

                {/* The filters stay in reach under the header while the grid scrolls. */}
                <div className="sticky top-16 z-20 -mx-4 mt-10 border-b border-gray-200 bg-gray-50/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative lg:w-72">
                            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                            <Input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search by name or area" aria-label="Search by name or area" className="h-10 rounded-full bg-card pl-11" />
                        </div>
                        <ToggleGroup
                            type="single"
                            variant="pill"
                            size="lg"
                            value={f.kind ?? ALL}
                            onValueChange={(v) => set({ kind: !v || v === ALL ? null : (v as BrowseFilters['kind']) })}
                            aria-label="Kind"
                            className="w-full overflow-x-auto pb-1 scrollbar-none lg:w-auto lg:pb-0"
                        >
                            <ToggleGroupItem value={ALL}>Everything</ToggleGroupItem>
                            {KINDS.map((k) => {
                                const Icon = KIND_INFO[k].icon;
                                return (
                                    <ToggleGroupItem key={k} value={k}>
                                        <Icon aria-hidden="true" />
                                        {KIND_INFO[k].plural}
                                    </ToggleGroupItem>
                                );
                            })}
                        </ToggleGroup>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <Select value={f.when} onValueChange={(v) => set({ when: v as When })}>
                            <SelectTrigger className="h-10 w-full rounded-full bg-card sm:w-40" aria-label="When">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {WHEN.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={f.city || ALL} onValueChange={(v) => set({ city: v === ALL ? '' : v })}>
                            <SelectTrigger className="h-10 w-full rounded-full bg-card sm:w-44" aria-label="City">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All cities</SelectItem>
                                {CITIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="lg" className="justify-start bg-card">
                                    <AdjustmentsHorizontalIcon />
                                    <span className="truncate">{priceLabel}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 space-y-4 p-5" align="start">
                                <Label>Price from</Label>
                                <Slider
                                    min={0}
                                    max={PRICE_STEPS.length - 1}
                                    step={1}
                                    value={[Math.max(0, PRICE_STEPS.findIndex((p) => p >= f.min)), Math.max(0, PRICE_STEPS.findIndex((p) => p >= f.max))]}
                                    onValueChange={([a, b]) => set({ min: PRICE_STEPS[a ?? 0] ?? 0, max: PRICE_STEPS[b ?? PRICE_STEPS.length - 1] ?? PRICE_STEPS.at(-1)! })}
                                    aria-label="Price range"
                                />
                                <p className="text-sm text-gray-600 tabular">{priceLabel}</p>
                            </PopoverContent>
                        </Popover>
                        <Select value={f.busy === null ? ALL : String(f.busy)} onValueChange={(v) => set({ busy: v === ALL ? null : Number(v) })}>
                            <SelectTrigger className="h-10 w-full rounded-full bg-card sm:w-48" aria-label="Busiest day">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>Any busy day</SelectItem>
                                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                    <SelectItem key={d} value={String(d)}>
                                        Busiest on {DAY_NAMES[d]}s
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={f.sort} onValueChange={(v) => set({ sort: v as Sort })}>
                            <SelectTrigger className="h-10 w-full rounded-full bg-card sm:ml-auto sm:w-40" aria-label="Sort by">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {SORTS.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-600" aria-live="polite">
                        {results.length} {results.length === 1 ? 'result' : 'results'}
                    </p>
                    {active && (
                        <Button variant="ghost" size="sm" onClick={() => set(EMPTY_FILTERS)}>
                            <XMarkIcon />
                            Clear filters
                        </Button>
                    )}
                </div>

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
