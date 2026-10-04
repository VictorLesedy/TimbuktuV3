import { EmptyState } from '@/components/empty-state';
import { ListingCard } from '@/components/listing/listing-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DAY_NAMES, isoDay, tsh } from '@/lib/format';
import { KIND_INFO } from '@/lib/kinds';
import { priceFrom, useSignals } from '@/lib/signals';
import { useQuery, useSetQuery } from '@/lib/url-state';
import { useApp } from '@/store/app-store';
import { CITIES, KINDS, type Kind, type Listing } from '@/types';
import { BanknotesIcon, LinkIcon, ListBulletIcon, MagnifyingGlassIcon, Squares2X2Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const SORTS = { trending: 'Trending', rating: 'Top rated', nearest: 'Nearest', newest: 'Newest' } as const;
type Sort = keyof typeof SORTS;
const PRICE_STEPS = [0, 10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000];
const ALL = 'all';

/** Whether a listing can be booked on a given day. */
function availableOn(l: Listing, day: string): boolean {
    const weekday = new Date(`${day}T12:00:00`).getDay();
    if (l.event) return isoDay(new Date(l.event.startsAt)) === day;
    if (l.venue) return !l.venue.closedOn.includes(weekday);
    if (l.service) return l.service.days.includes(weekday);
    return !l.professional?.unavailable.includes(day);
}

export default function Explore() {
    const query = useQuery();
    const setQuery = useSetQuery();
    const listings = useApp((s) => s.listings);
    const signals = useSignals();

    const q = query.get('q') ?? '';
    const kind = (query.get('kind') as Kind | null) ?? null;
    const city = query.get('city') ?? '';
    const date = query.get('date') ?? '';
    const busy = query.get('busy');
    const min = Number(query.get('min') ?? 0);
    const max = Number(query.get('max') ?? PRICE_STEPS.at(-1));
    const sort = ((query.get('sort') as Sort | null) ?? 'trending') in SORTS ? ((query.get('sort') as Sort | null) ?? 'trending') : 'trending';
    const view = query.get('view') === 'list' ? 'list' : 'grid';

    // Typing updates the link after a pause, so the address bar does not churn on every key.
    const [text, setText] = useState(q);
    useEffect(() => setText(q), [q]);
    useEffect(() => {
        if (text === q) return;
        const t = setTimeout(() => setQuery({ q: text.trim() || null }), 300);
        return () => clearTimeout(t);
    }, [text, q, setQuery]);

    const results = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const out = listings.filter((l) => {
            if (l.status !== 'live') return false;
            if (kind && l.kind !== kind) return false;
            if (city && l.city !== city) return false;
            if (date && !availableOn(l, date)) return false;
            const price = priceFrom(l);
            if (price < min || price > max) return false;
            if (busy !== null && busy !== '') {
                const s = signals.get(l.id);
                if (!s || s.peakDay !== Number(busy)) return false;
            }
            if (needle) {
                const hay = `${l.title} ${l.area} ${l.city} ${l.category} ${l.summary}`.toLowerCase();
                if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
            }
            return true;
        });
        const s = (l: Listing) => signals.get(l.id)!;
        const sorters: Record<Sort, (a: Listing, b: Listing) => number> = {
            trending: (a, b) => s(b).momentum.score - s(a).momentum.score || s(b).checkIns - s(a).checkIns,
            rating: (a, b) => s(b).rating.average - s(a).rating.average || s(b).rating.count - s(a).rating.count,
            nearest: (a, b) => a.distanceKm - b.distanceKm,
            newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
        };
        return out.sort(sorters[sort]);
    }, [listings, signals, q, kind, city, date, busy, min, max, sort]);

    const active = Boolean(q || kind || city || date || busy || min > 0 || max < PRICE_STEPS.at(-1)!);
    const priceLabel = min > 0 || max < PRICE_STEPS.at(-1)! ? `${tsh(min)} to ${tsh(max)}` : 'Any price';

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
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-6 md:py-12">
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

                <div className="space-y-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                            type="search"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Search by name or area"
                            aria-label="Search by name or area"
                            className="h-12 rounded-full pl-12 text-base"
                        />
                    </div>

                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={kind ?? ALL}
                        onValueChange={(v) => setQuery({ kind: !v || v === ALL ? null : v })}
                        className="scrollbar-none w-full justify-start overflow-x-auto"
                        aria-label="Kind"
                    >
                        <ToggleGroupItem value={ALL} className="flex-none">
                            Everything
                        </ToggleGroupItem>
                        {KINDS.map((k) => {
                            const Icon = KIND_INFO[k].icon;
                            return (
                                <ToggleGroupItem key={k} value={k} className="flex-none">
                                    <Icon className="size-4" aria-hidden="true" />
                                    {KIND_INFO[k].plural}
                                </ToggleGroupItem>
                            );
                        })}
                    </ToggleGroup>

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <Select value={city || ALL} onValueChange={(v) => setQuery({ city: v === ALL ? null : v })}>
                            <SelectTrigger className="w-full sm:w-44" aria-label="City">
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
                        <Input
                            type="date"
                            value={date}
                            min={isoDay(Date.now())}
                            onChange={(e) => setQuery({ date: e.target.value || null })}
                            aria-label="Date"
                            className="h-10 w-full sm:w-44"
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="justify-start">
                                    <BanknotesIcon />
                                    <span className="truncate">{priceLabel}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 space-y-4 p-5" align="start">
                                <Label>Price from</Label>
                                <Slider
                                    min={0}
                                    max={PRICE_STEPS.length - 1}
                                    step={1}
                                    value={[Math.max(0, PRICE_STEPS.findIndex((p) => p >= min)), Math.max(0, PRICE_STEPS.findIndex((p) => p >= max))]}
                                    onValueChange={([a, b]) => setQuery({ min: a ? PRICE_STEPS[a!] : null, max: b === PRICE_STEPS.length - 1 ? null : PRICE_STEPS[b!] })}
                                    aria-label="Price range"
                                />
                                <p className="text-sm text-muted-foreground tabular">{priceLabel}</p>
                            </PopoverContent>
                        </Popover>
                        <Select value={busy ?? ALL} onValueChange={(v) => setQuery({ busy: v === ALL ? null : v })}>
                            <SelectTrigger className="w-full sm:w-52" aria-label="Busiest day">
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
                        {active && (
                            <Button variant="ghost" className="h-10" onClick={() => setQuery({ q: null, kind: null, city: null, date: null, busy: null, min: null, max: null })}>
                                <XMarkIcon />
                                Clear filters
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                        {results.length} {results.length === 1 ? 'result' : 'results'}
                    </p>
                    <div className="flex items-center gap-2">
                        <Select value={sort} onValueChange={(v) => setQuery({ sort: v === 'trending' ? null : v })}>
                            <SelectTrigger className="h-9 w-40" aria-label="Sort by">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {(Object.keys(SORTS) as Sort[]).map((k) => (
                                    <SelectItem key={k} value={k}>
                                        {SORTS[k]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setQuery({ view: v === 'grid' ? null : v })} aria-label="Layout">
                            <ToggleGroupItem value="grid" aria-label="Grid" className="size-9">
                                <Squares2X2Icon className="size-5" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="list" aria-label="List" className="size-9">
                                <ListBulletIcon className="size-5" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>

                {results.length === 0 ? (
                    <EmptyState
                        icon={MagnifyingGlassIcon}
                        title="Nothing matches yet"
                        body="Try another date or city, or clear the filters to see everything."
                        action={
                            <Button variant="outline" onClick={() => setQuery({ q: null, kind: null, city: null, date: null, busy: null, min: null, max: null })}>
                                Clear filters
                            </Button>
                        }
                    />
                ) : view === 'grid' ? (
                    <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {results.map((l) => (
                            <li key={l.id}>
                                <ListingCard listing={l} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="grid gap-3 lg:grid-cols-2">
                        {results.map((l) => (
                            <li key={l.id}>
                                <ListingCard listing={l} layout="list" />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
