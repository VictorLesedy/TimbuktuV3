import { ListingDetail } from '@/components/listing/listing-detail';
import { Photo } from '@/components/listing/photo';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LIBRARY, PHOTOS } from '@/data/photos';
import { PageHeader } from '@/layouts/console-layout';
import { DAY, DAY_SHORT, isoDay } from '@/lib/format';
import { KIND_INFO } from '@/lib/kinds';
import { computeSignals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import { useApp, useCurrentHost } from '@/store/app-store';
import { CITIES, KINDS, type Category, type Kind, type Listing, type Photo as PhotoType } from '@/types';
import { CheckIcon, ExclamationTriangleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

const STEPS = ['Kind', 'Details', 'Photos', 'Pricing', 'Schedule', 'Preview'];
const CATEGORIES: Record<Kind, Category[]> = {
    event: ['Concert', 'Match day', 'Festival', 'Comedy', 'Family day'],
    venue: ['Nightlife', 'Cinema', 'Arcade', 'Gallery', 'Family day'],
    service: ['Tour', 'Class'],
    professional: ['Talent'],
};
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const slug = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

function blank(kind: Kind, hostId: string, city: Listing['city']): Listing {
    const nextSat = new Date(Date.now() + ((6 - new Date().getDay() + 7) % 7 || 7) * DAY);
    const base: Listing = {
        id: `l-${Date.now().toString(36)}`,
        slug: '',
        kind,
        category: CATEGORIES[kind][0]!,
        title: '',
        summary: '',
        description: '',
        city,
        area: '',
        distanceKm: 5,
        hostId,
        photos: [],
        status: 'pending',
        featured: false,
        createdAt: new Date().toISOString(),
    };
    if (kind === 'event') base.event = { startsAt: `${isoDay(nextSat)}T19:00`, endsAt: `${isoDay(nextSat)}T23:00`, place: '', tiers: [{ id: 't-1', name: 'General', price: 20000, includes: 'Entry', capacity: 200 }] };
    if (kind === 'venue') base.venue = { opens: '17:00', closes: '23:00', closedOn: [], options: [{ id: 'o-1', name: 'Entry', price: 10000, deposit: 10000, includes: 'Entry', perDay: 100 }] };
    if (kind === 'service') base.service = { durationMins: 120, days: [6, 0], times: ['10:00'], capacity: 12, pricePerPerson: 30000, maxGroup: 6, meetingPoint: '' };
    if (kind === 'professional') base.professional = { rateFrom: 300000, rateUnit: 'for four hours', offers: ['Weddings', 'Birthdays'], unavailable: [], responseHours: 6 };
    return base;
}

function F({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
    );
}

/** An ISO time as the yyyy-mm-ddThh:mm a datetime-local input expects, in local time. */
const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    return `${isoDay(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const num = (v: string) => Number(v.replace(/\D/g, '')) || 0;

function validate(step: number, d: Listing): Record<string, string> {
    const e: Record<string, string> = {};
    if (step === 1) {
        if (d.title.trim().length < 4) e.title = 'Give it a name fans will recognise.';
        if (!d.area.trim()) e.area = 'Say which area it is in.';
        if (d.summary.trim().length < 20) e.summary = 'One sentence of at least 20 characters.';
        if (d.description.trim().length < 40) e.description = 'Describe it in a few sentences.';
    }
    if (step === 2 && d.photos.length === 0) e.photos = 'Pick at least one photo.';
    if (step === 3) {
        if (d.event && d.event.tiers.some((t) => !t.name.trim() || t.price <= 0 || t.capacity <= 0)) e.pricing = 'Every tier needs a name, a price and a number of tickets.';
        if (d.venue && d.venue.options.some((o) => !o.name.trim() || o.price <= 0 || o.deposit <= 0 || o.deposit > o.price || o.perDay <= 0)) e.pricing = 'Every option needs a name, a price, a deposit no higher than the price, and a daily limit.';
        if (d.service && (d.service.pricePerPerson <= 0 || d.service.maxGroup <= 0 || d.service.capacity < d.service.maxGroup)) e.pricing = 'Set a price per person, a group size, and spaces per slot at least as big as a group.';
        if (d.professional && d.professional.rateFrom <= 0) e.pricing = 'Set a starting rate.';
    }
    if (step === 4) {
        if (d.event && (!d.event.place.trim() || new Date(d.event.startsAt).getTime() < Date.now() || new Date(d.event.endsAt) <= new Date(d.event.startsAt))) e.schedule = 'Set a future start, an end after it, and the place.';
        if (d.venue && d.venue.closedOn.length === 7) e.schedule = 'The venue needs at least one open day.';
        if (d.service && (!d.service.days.length || !d.service.times.length || !d.service.meetingPoint.trim())) e.schedule = 'Pick days, at least one start time and a meeting point.';
    }
    return e;
}

export default function ListingWizard({ id }: { id?: string }) {
    const host = useCurrentHost();
    const existing = useApp((s) => (id ? s.listings.find((l) => l.id === id) : undefined));
    const settings = useApp((s) => s.settings);
    const submitListing = useApp((s) => s.submitListing);
    const [step, setStep] = useState(existing ? 1 : 0);
    const [draft, setDraft] = useState<Listing>(() => {
        if (!existing) return blank('event', host.id, host.city);
        const copy = structuredClone(existing);
        if (copy.event) copy.event = { ...copy.event, startsAt: toLocalInput(copy.event.startsAt), endsAt: toLocalInput(copy.event.endsAt) };
        return copy;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const set = (patch: Partial<Listing>) => setDraft((d) => ({ ...d, ...patch }));

    const signals = useMemo(() => computeSignals([draft], [], [], [], settings).get(draft.id)!, [draft, settings]);

    const go = (to: number) => {
        if (to > step) {
            for (let s = step; s < to; s++) {
                const e = validate(s, draft);
                if (Object.keys(e).length) {
                    setErrors(e);
                    setStep(s);
                    return;
                }
            }
        }
        setErrors({});
        setStep(to);
        window.scrollTo({ top: 0 });
    };

    const submit = () => {
        const final: Listing = {
            ...draft,
            slug: draft.slug || `${slug(draft.title)}-${draft.id.slice(-4)}`,
            event: draft.event && { ...draft.event, startsAt: new Date(draft.event.startsAt).toISOString(), endsAt: new Date(draft.event.endsAt).toISOString() },
        };
        submitListing(final);
        toast.success('Sent for approval', { description: 'The Timbuktu team usually reviews new listings within a day.' });
        router.visit('/studio/listings');
    };

    const togglePhoto = (p: PhotoType) => set({ photos: draft.photos.some((x) => x.src === p.src) ? draft.photos.filter((x) => x.src !== p.src) : [...draft.photos, p] });
    const library = [...new Map([...draft.photos, ...LIBRARY.map((k) => PHOTOS[k])].map((p) => [p.src, p])).values()];

    return (
        <>
            <Head title={existing ? 'Edit listing' : 'New listing'} />
            <PageHeader title={existing ? `Edit ${existing.title}` : 'New listing'} description="Six steps. You see it exactly as fans will before it goes to the Timbuktu team." />
            {existing?.reviewNote && (
                <p className="mb-6 flex items-start gap-2 rounded-xl bg-primary/10 p-4 text-sm">
                    <ExclamationTriangleIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                        <span className="font-semibold">The Timbuktu team asked for changes:</span> {existing.reviewNote}
                    </span>
                </p>
            )}
            <ol className="scrollbar-none mb-8 flex gap-2 overflow-x-auto" aria-label="Steps">
                {STEPS.map((s, i) => (
                    <li key={s} className="shrink-0">
                        <button
                            type="button"
                            onClick={() => go(i)}
                            disabled={existing ? false : i > step}
                            aria-current={i === step ? 'step' : undefined}
                            className={cn(
                                'flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors disabled:opacity-50',
                                i === step ? 'border-primary bg-primary text-primary-foreground' : i < step ? 'bg-secondary' : '',
                            )}
                        >
                            {i < step ? <CheckIcon className="size-4" aria-hidden="true" /> : <span className="tabular">{i + 1}</span>}
                            {s}
                        </button>
                    </li>
                ))}
            </ol>

            <div className={cn(step === 5 ? '' : 'max-w-3xl', 'space-y-6')}>
                {step === 0 && (
                    <RadioGroup
                        value={draft.kind}
                        onValueChange={(v) => setDraft((d) => ({ ...blank(v as Kind, host.id, host.city), title: d.title, summary: d.summary, description: d.description, area: d.area, photos: d.photos }))}
                        className="grid gap-3 sm:grid-cols-2"
                    >
                        {KINDS.map((k) => {
                            const Icon = KIND_INFO[k].icon;
                            return (
                                <Label key={k} className="flex cursor-pointer items-start gap-4 rounded-2xl border p-5 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                                    <RadioGroupItem value={k} className="sr-only" />
                                    <Icon className="size-7 shrink-0 text-primary" aria-hidden="true" />
                                    <span className="space-y-1">
                                        <span className="block text-lg font-semibold">{KIND_INFO[k].label}</span>
                                        <span className="block text-muted-foreground">{KIND_INFO[k].how}</span>
                                    </span>
                                </Label>
                            );
                        })}
                    </RadioGroup>
                )}

                {step === 1 && (
                    <div className="grid gap-5 sm:grid-cols-2">
                        <F label="Name" htmlFor="w-title" error={errors.title} className="sm:col-span-2">
                            <Input id="w-title" value={draft.title} onChange={(e) => set({ title: e.target.value })} aria-invalid={Boolean(errors.title)} />
                        </F>
                        <F label="Category" htmlFor="w-cat">
                            <Select value={draft.category} onValueChange={(v) => set({ category: v as Category })}>
                                <SelectTrigger id="w-cat" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES[draft.kind].map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </F>
                        <F label="City" htmlFor="w-city">
                            <Select value={draft.city} onValueChange={(v) => set({ city: v as Listing['city'] })}>
                                <SelectTrigger id="w-city" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CITIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </F>
                        <F label="Area" htmlFor="w-area" error={errors.area} hint="Like Masaki, Stone Town or Njiro.">
                            <Input id="w-area" value={draft.area} onChange={(e) => set({ area: e.target.value })} aria-invalid={Boolean(errors.area)} />
                        </F>
                        <F label="One-line summary" htmlFor="w-sum" error={errors.summary} hint={`${draft.summary.length} of 120 characters. Shown on cards.`} className="sm:col-span-2">
                            <Input id="w-sum" maxLength={120} value={draft.summary} onChange={(e) => set({ summary: e.target.value })} aria-invalid={Boolean(errors.summary)} />
                        </F>
                        <F label="Description" htmlFor="w-desc" error={errors.description} className="sm:col-span-2">
                            <Textarea id="w-desc" rows={5} value={draft.description} onChange={(e) => set({ description: e.target.value })} aria-invalid={Boolean(errors.description)} />
                        </F>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <p className="text-muted-foreground">Photo uploads arrive with the back end. For now, pick from these sample photos. The first one you pick is the cover.</p>
                        {errors.photos && <p className="text-sm text-destructive">{errors.photos}</p>}
                        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {library.map((p) => {
                                const index = draft.photos.findIndex((x) => x.src === p.src);
                                return (
                                    <li key={p.src}>
                                        <button
                                            type="button"
                                            onClick={() => togglePhoto(p)}
                                            aria-pressed={index >= 0}
                                            aria-label={p.alt}
                                            className={cn('relative block w-full overflow-hidden rounded-xl ring-2 ring-offset-2 ring-offset-background', index >= 0 ? 'ring-primary' : 'ring-transparent')}
                                        >
                                            <Photo photo={p} width={320} ratio={4 / 3} sizes="200px" />
                                            {index >= 0 && (
                                                <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{index === 0 ? 'Cover' : index + 1}</span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-5">
                        {errors.pricing && <p className="text-sm text-destructive">{errors.pricing}</p>}
                        {draft.event && (
                            <>
                                <p className="text-muted-foreground">Ticket tiers, such as early bird, general or VIP.</p>
                                {draft.event.tiers.map((t, i) => (
                                    <div key={t.id} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_9rem_8rem_auto]">
                                        <F label="Tier" htmlFor={`t-name-${i}`}>
                                            <Input id={`t-name-${i}`} value={t.name} onChange={(e) => set({ event: { ...draft.event!, tiers: draft.event!.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) } })} />
                                        </F>
                                        <F label="Price (TSh)" htmlFor={`t-price-${i}`}>
                                            <Input id={`t-price-${i}`} inputMode="numeric" value={t.price || ''} onChange={(e) => set({ event: { ...draft.event!, tiers: draft.event!.tiers.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)) } })} />
                                        </F>
                                        <F label="Tickets" htmlFor={`t-cap-${i}`}>
                                            <Input id={`t-cap-${i}`} inputMode="numeric" value={t.capacity || ''} onChange={(e) => set({ event: { ...draft.event!, tiers: draft.event!.tiers.map((x, j) => (j === i ? { ...x, capacity: num(e.target.value) } : x)) } })} />
                                        </F>
                                        <div className="flex items-end">
                                            <Button variant="ghost" size="icon" aria-label={`Remove ${t.name || 'tier'}`} disabled={draft.event!.tiers.length === 1} onClick={() => set({ event: { ...draft.event!, tiers: draft.event!.tiers.filter((_, j) => j !== i) } })}>
                                                <TrashIcon />
                                            </Button>
                                        </div>
                                        <F label="What it includes" htmlFor={`t-inc-${i}`} className="sm:col-span-4">
                                            <Input id={`t-inc-${i}`} value={t.includes} onChange={(e) => set({ event: { ...draft.event!, tiers: draft.event!.tiers.map((x, j) => (j === i ? { ...x, includes: e.target.value } : x)) } })} />
                                        </F>
                                    </div>
                                ))}
                                <Button variant="outline" onClick={() => set({ event: { ...draft.event!, tiers: [...draft.event!.tiers, { id: `t-${Date.now()}`, name: '', price: 0, includes: '', capacity: 50 }] } })}>
                                    <PlusIcon />
                                    Add a tier
                                </Button>
                            </>
                        )}
                        {draft.venue && (
                            <>
                                <p className="text-muted-foreground">Entry, tables or packages. The deposit is paid on Timbuktu and comes off the bill on the day.</p>
                                {draft.venue.options.map((o, i) => {
                                    const upd = (patch: Partial<typeof o>) => set({ venue: { ...draft.venue!, options: draft.venue!.options.map((x, j) => (j === i ? { ...x, ...patch } : x)) } });
                                    return (
                                        <div key={o.id} className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_8rem_8rem_7rem_auto]">
                                            <F label="Option" htmlFor={`o-name-${i}`}>
                                                <Input id={`o-name-${i}`} value={o.name} onChange={(e) => upd({ name: e.target.value })} />
                                            </F>
                                            <F label="Price (TSh)" htmlFor={`o-price-${i}`}>
                                                <Input id={`o-price-${i}`} inputMode="numeric" value={o.price || ''} onChange={(e) => upd({ price: num(e.target.value) })} />
                                            </F>
                                            <F label="Deposit (TSh)" htmlFor={`o-dep-${i}`}>
                                                <Input id={`o-dep-${i}`} inputMode="numeric" value={o.deposit || ''} onChange={(e) => upd({ deposit: num(e.target.value) })} />
                                            </F>
                                            <F label="Per day" htmlFor={`o-day-${i}`}>
                                                <Input id={`o-day-${i}`} inputMode="numeric" value={o.perDay || ''} onChange={(e) => upd({ perDay: num(e.target.value) })} />
                                            </F>
                                            <div className="flex items-end">
                                                <Button variant="ghost" size="icon" aria-label={`Remove ${o.name || 'option'}`} disabled={draft.venue!.options.length === 1} onClick={() => set({ venue: { ...draft.venue!, options: draft.venue!.options.filter((_, j) => j !== i) } })}>
                                                    <TrashIcon />
                                                </Button>
                                            </div>
                                            <F label="What it includes" htmlFor={`o-inc-${i}`} className="sm:col-span-5">
                                                <Input id={`o-inc-${i}`} value={o.includes} onChange={(e) => upd({ includes: e.target.value })} />
                                            </F>
                                        </div>
                                    );
                                })}
                                <Button variant="outline" onClick={() => set({ venue: { ...draft.venue!, options: [...draft.venue!.options, { id: `o-${Date.now()}`, name: '', price: 0, deposit: 0, includes: '', perDay: 10 }] } })}>
                                    <PlusIcon />
                                    Add an option
                                </Button>
                            </>
                        )}
                        {draft.service && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <F label="Price per person (TSh)" htmlFor="s-price">
                                    <Input id="s-price" inputMode="numeric" value={draft.service.pricePerPerson || ''} onChange={(e) => set({ service: { ...draft.service!, pricePerPerson: num(e.target.value) } })} />
                                </F>
                                <F label="Largest group per booking" htmlFor="s-group">
                                    <Input id="s-group" inputMode="numeric" value={draft.service.maxGroup || ''} onChange={(e) => set({ service: { ...draft.service!, maxGroup: num(e.target.value) } })} />
                                </F>
                                <F label="Spaces per time slot" htmlFor="s-cap">
                                    <Input id="s-cap" inputMode="numeric" value={draft.service.capacity || ''} onChange={(e) => set({ service: { ...draft.service!, capacity: num(e.target.value) } })} />
                                </F>
                                <F label="Length (minutes)" htmlFor="s-dur">
                                    <Input id="s-dur" inputMode="numeric" value={draft.service.durationMins || ''} onChange={(e) => set({ service: { ...draft.service!, durationMins: num(e.target.value) } })} />
                                </F>
                            </div>
                        )}
                        {draft.professional && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <F label="Rate from (TSh)" htmlFor="p-rate">
                                    <Input id="p-rate" inputMode="numeric" value={draft.professional.rateFrom || ''} onChange={(e) => set({ professional: { ...draft.professional!, rateFrom: num(e.target.value) } })} />
                                </F>
                                <F label="For" htmlFor="p-unit" hint="Like “for four hours” or “for two sets”.">
                                    <Input id="p-unit" value={draft.professional.rateUnit} onChange={(e) => set({ professional: { ...draft.professional!, rateUnit: e.target.value } })} />
                                </F>
                                <F label="What you do" htmlFor="p-offers" hint="Separate with commas." className="sm:col-span-2">
                                    <Input id="p-offers" value={draft.professional.offers.join(', ')} onChange={(e) => set({ professional: { ...draft.professional!, offers: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) } })} />
                                </F>
                            </div>
                        )}
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-5">
                        {errors.schedule && <p className="text-sm text-destructive">{errors.schedule}</p>}
                        {draft.event && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <F label="Starts" htmlFor="e-start">
                                    <Input id="e-start" type="datetime-local" value={draft.event.startsAt.slice(0, 16)} onChange={(e) => set({ event: { ...draft.event!, startsAt: e.target.value } })} />
                                </F>
                                <F label="Ends" htmlFor="e-end">
                                    <Input id="e-end" type="datetime-local" value={draft.event.endsAt.slice(0, 16)} onChange={(e) => set({ event: { ...draft.event!, endsAt: e.target.value } })} />
                                </F>
                                <F label="Place" htmlFor="e-place" className="sm:col-span-2">
                                    <Input id="e-place" value={draft.event.place} onChange={(e) => set({ event: { ...draft.event!, place: e.target.value } })} placeholder="Venue and area" />
                                </F>
                            </div>
                        )}
                        {draft.venue && (
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <F label="Opens" htmlFor="v-open">
                                        <Input id="v-open" type="time" value={draft.venue.opens} onChange={(e) => set({ venue: { ...draft.venue!, opens: e.target.value } })} />
                                    </F>
                                    <F label="Closes" htmlFor="v-close">
                                        <Input id="v-close" type="time" value={draft.venue.closes} onChange={(e) => set({ venue: { ...draft.venue!, closes: e.target.value } })} />
                                    </F>
                                </div>
                                <F label="Open on">
                                    <ToggleGroup
                                        type="multiple"
                                        variant="outline"
                                        value={WEEK.filter((d) => !draft.venue!.closedOn.includes(d)).map(String)}
                                        onValueChange={(v) => set({ venue: { ...draft.venue!, closedOn: WEEK.filter((d) => !v.includes(String(d))) } })}
                                        className="flex-wrap justify-start"
                                    >
                                        {WEEK.map((d) => (
                                            <ToggleGroupItem key={d} value={String(d)} className="w-14">
                                                {DAY_SHORT[d]}
                                            </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </F>
                            </div>
                        )}
                        {draft.service && (
                            <div className="space-y-5">
                                <F label="Runs on">
                                    <ToggleGroup type="multiple" variant="outline" value={draft.service.days.map(String)} onValueChange={(v) => set({ service: { ...draft.service!, days: v.map(Number) } })} className="flex-wrap justify-start">
                                        {WEEK.map((d) => (
                                            <ToggleGroupItem key={d} value={String(d)} className="w-14">
                                                {DAY_SHORT[d]}
                                            </ToggleGroupItem>
                                        ))}
                                    </ToggleGroup>
                                </F>
                                <F label="Start times" hint="The same times repeat on every day it runs.">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {draft.service.times.map((t, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <Input type="time" aria-label={`Start time ${i + 1}`} value={t} onChange={(e) => set({ service: { ...draft.service!, times: draft.service!.times.map((x, j) => (j === i ? e.target.value : x)) } })} className="w-32" />
                                                <Button variant="ghost" size="icon" aria-label="Remove time" disabled={draft.service!.times.length === 1} onClick={() => set({ service: { ...draft.service!, times: draft.service!.times.filter((_, j) => j !== i) } })}>
                                                    <TrashIcon />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button variant="outline" onClick={() => set({ service: { ...draft.service!, times: [...draft.service!.times, '14:00'] } })}>
                                            <PlusIcon />
                                            Add a time
                                        </Button>
                                    </div>
                                </F>
                                <F label="Meeting point" htmlFor="s-meet">
                                    <Input id="s-meet" value={draft.service.meetingPoint} onChange={(e) => set({ service: { ...draft.service!, meetingPoint: e.target.value } })} />
                                </F>
                            </div>
                        )}
                        {draft.professional && (
                            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                                <F label="Dates you are not available">
                                    <div className="rounded-xl border">
                                        <Calendar
                                            mode="multiple"
                                            selected={draft.professional.unavailable.map((d) => new Date(`${d}T12:00:00`))}
                                            onSelect={(dates) => set({ professional: { ...draft.professional!, unavailable: (dates ?? []).map((d) => isoDay(d)) } })}
                                            disabled={{ before: new Date() }}
                                        />
                                    </div>
                                </F>
                                <F label="Usual reply time (hours)" htmlFor="p-reply" hint="Shown to fans on your listing.">
                                    <Input id="p-reply" inputMode="numeric" value={draft.professional.responseHours || ''} onChange={(e) => set({ professional: { ...draft.professional!, responseHours: num(e.target.value) } })} className="w-32" />
                                </F>
                            </div>
                        )}
                    </div>
                )}

                {step === 5 && (
                    <div className="space-y-6">
                        <p className="rounded-xl bg-secondary p-4 text-sm">This is how fans will see your listing. Live signals fill in once bookings and check-ins arrive.</p>
                        <div className="rounded-3xl border p-4 md:p-8">
                            <ListingDetail
                                listing={{ ...draft, event: draft.event && { ...draft.event, startsAt: new Date(draft.event.startsAt).toISOString(), endsAt: new Date(draft.event.endsAt).toISOString() } }}
                                host={host}
                                signals={signals}
                                reviews={[]}
                                preview
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-between gap-3 border-t pt-6">
                    <Button variant="ghost" size="lg" onClick={() => (step === 0 ? router.visit('/studio/listings') : go(step - 1))}>
                        {step === 0 ? 'Cancel' : 'Back'}
                    </Button>
                    {step < 5 ? (
                        <Button size="lg" onClick={() => go(step + 1)}>
                            Continue to {STEPS[step + 1]!.toLowerCase()}
                        </Button>
                    ) : (
                        <Button size="lg" onClick={submit}>
                            Send for approval
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
