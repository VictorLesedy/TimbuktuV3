import { Container } from '@/components/container';
import { EmptyState } from '@/components/empty-state';
import { Photo } from '@/components/listing/photo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
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
// A filter that is not at its default is marked, so it is clear what is narrowing the list.
const ON = 'border-primary ring-1 ring-primary';
// The chosen kind fills, so it reads as selected at a glance.
const KIND_ON = 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';
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
    const priced = f.min > 0 || f.max < PRICE_STEPS.at(-1)!;
    const priceLabel = priced ? `${tsh(f.min)} to ${tsh(f.max)}` : 'Any price';
    // Everything narrowing the list, each removable on its own.
    const chips: { id: string; label: string; clear: Partial<BrowseFilters> }[] = [];
    if (f.q) chips.push({ id: 'q', label: `“${f.q}”`, clear: { q: '' } });
    if (f.kind) chips.push({ id: 'kind', label: KIND_INFO[f.kind].plural, clear: { kind: null } });
    if (f.when !== 'any') chips.push({ id: 'when', label: WHEN.find((w) => w.id === f.when)!.label, clear: { when: 'any' } });
    if (f.city) chips.push({ id: 'city', label: f.city, clear: { city: '' } });
    if (priced) chips.push({ id: 'price', label: priceLabel, clear: { min: 0, max: PRICE_STEPS.at(-1)! } });
    if (f.busy !== null) chips.push({ id: 'busy', label: `Busiest on ${DAY_NAMES[f.busy]}s`, clear: { busy: null } });

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
                    <Button asChild variant="link" className="self-start px-0 text-base font-semibold text-navy-900 md:self-auto">
                        <Link href={exploreHref(f)}>
                            Open in Explore
                            <ArrowRightIcon aria-hidden="true" />
                        </Link>
                    </Button>
                </div>

                {/* The filters stay in reach under the header while the grid scrolls. */}
                <div className="sticky top-16 z-20 -mx-4 mt-10 border-b bg-gray-50 px-4 py-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative lg:w-72">
                            <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search by name or area" aria-label="Search by name or area" className={cn('bg-card pl-9', f.q && ON)} />
                        </div>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            spacing={0}
                            value={f.kind ?? ALL}
                            onValueChange={(v) => set({ kind: !v || v === ALL ? null : (v as BrowseFilters['kind']) })}
                            aria-label="Kind"
                            className="max-w-full overflow-x-auto bg-card scrollbar-none"
                        >
                            <ToggleGroupItem value={ALL} className={KIND_ON}>
                                Everything
                            </ToggleGroupItem>
                            {KINDS.map((k) => {
                                const Icon = KIND_INFO[k].icon;
                                return (
                                    <ToggleGroupItem key={k} value={k} className={KIND_ON}>
                                        <Icon aria-hidden="true" />
                                        {KIND_INFO[k].plural}
                                    </ToggleGroupItem>
                                );
                            })}
                        </ToggleGroup>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <Select value={f.when} onValueChange={(v) => set({ when: v as When })}>
                            <SelectTrigger className={cn('w-full bg-card sm:w-40', f.when !== 'any' && ON)} aria-label="When">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>When</SelectLabel>
                                    {WHEN.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select value={f.city || ALL} onValueChange={(v) => set({ city: v === ALL ? '' : v })}>
                            <SelectTrigger className={cn('w-full bg-card sm:w-44', f.city && ON)} aria-label="City">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>City</SelectLabel>
                                    <SelectItem value={ALL}>All cities</SelectItem>
                                    {CITIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn('justify-start bg-card', priced && ON)}>
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
                            <SelectTrigger className={cn('w-full bg-card sm:w-48', f.busy !== null && ON)} aria-label="Busiest day">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Busiest day</SelectLabel>
                                    <SelectItem value={ALL}>Any busy day</SelectItem>
                                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                                        <SelectItem key={d} value={String(d)}>
                                            Busiest on {DAY_NAMES[d]}s
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Select value={f.sort} onValueChange={(v) => set({ sort: v as Sort })}>
                            <SelectTrigger className={cn('w-full bg-card sm:ml-auto sm:w-40', f.sort !== 'soonest' && ON)} aria-label="Sort by">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectGroup>
                                    <SelectLabel>Sort by</SelectLabel>
                                    {SORTS.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                    <p className="mr-2 text-sm text-gray-600" aria-live="polite">
                        {results.length} {results.length === 1 ? 'result' : 'results'}
                    </p>
                    {chips.map((c) => (
                        <Badge key={c.id} variant="outline" className="h-7 gap-1 bg-card pr-1 pl-2.5 text-sm">
                            {c.label}
                            <Button variant="ghost" size="icon-xs" aria-label={`Remove ${c.label}`} onClick={() => set(c.clear)}>
                                <XMarkIcon />
                            </Button>
                        </Badge>
                    ))}
                    {chips.length > 0 && (
                        <Button variant="link" size="sm" onClick={() => set({ ...EMPTY_FILTERS, sort: f.sort })}>
                            Clear all
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
