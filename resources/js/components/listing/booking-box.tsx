import { QuickRegister } from '@/components/fan/quick-register';
import { Stepper } from '@/components/stepper';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { eventSold, proBookedDays, serviceBooked, venueBooked } from '@/lib/cart';
import { DAY, DAY_SHORT, formatDateLong, formatDateTime, formatTime, isoDay, startOfDay, tsh } from '@/lib/format';
import { busynessOn, type Signals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import { useApp } from '@/store/app-store';
import type { Listing } from '@/types';
import { CalendarDaysIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Link, router } from '@inertiajs/react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

function OptionRow({ value, disabled, children }: { value: string; disabled?: boolean; children: ReactNode }) {
    return (
        <Label
            className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5',
                disabled && 'cursor-not-allowed opacity-50',
            )}
        >
            <RadioGroupItem value={value} disabled={disabled} className="mt-0.5" />
            <span className="flex min-w-0 flex-1 items-start justify-between gap-3">{children}</span>
        </Label>
    );
}

function Left({ n, of }: { n: number; of: number }) {
    if (n <= 0) return <span className="text-sm text-destructive">Sold out</span>;
    if (n <= Math.max(5, of * 0.15)) return <span className="text-sm font-medium text-live">Only {n} left</span>;
    return <span className="text-sm text-muted-foreground">{n} left</span>;
}

function Total({ label = 'Total', amount, note }: { label?: string; amount: number; note?: string }) {
    return (
        <div className="flex items-end justify-between gap-3 border-t pt-4">
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                {note && <p className="text-sm text-muted-foreground">{note}</p>}
            </div>
            <p className="font-display text-2xl tabular">{tsh(amount)}</p>
        </div>
    );
}

/** The next n days, as Date objects at midnight. */
function nextDays(n: number): Date[] {
    const start = startOfDay(Date.now());
    return Array.from({ length: n }, (_, i) => new Date(start.getTime() + i * DAY));
}

function DayChips({ days, value, onChange, isDisabled, sub }: { days: Date[]; value: string; onChange: (d: string) => void; isDisabled: (d: Date) => boolean; sub: (d: Date) => string }) {
    return (
        <div role="radiogroup" aria-label="Date" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((d, i) => {
                const key = isoDay(d);
                const disabled = isDisabled(d);
                const selected = key === value;
                return (
                    <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => onChange(key)}
                        className={cn(
                            'flex w-[4.75rem] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                            selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-secondary',
                        )}
                    >
                        <span className="text-xs">{i === 0 ? 'Today' : DAY_SHORT[d.getDay()]}</span>
                        <span className="font-semibold tabular">{d.getDate()}</span>
                        <span className={cn('text-[0.7rem] leading-tight', selected ? 'opacity-90' : 'text-muted-foreground')}>{sub(d)}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** Sends the fan on to checkout, or to sign up first when the admin wants sign-up before choosing. */
function useProceed() {
    const signedIn = useApp((s) => s.session.signedIn);
    const timing = useApp((s) => s.settings.signupTiming);
    return (href: string) => {
        if (!signedIn && timing === 'before') router.visit(`/join?next=${encodeURIComponent(href)}`);
        else router.visit(href);
    };
}

function EventBox({ listing }: { listing: Listing }) {
    const orders = useApp((s) => s.orders);
    const proceed = useProceed();
    const ev = listing.event!;
    const left = useMemo(() => Object.fromEntries(ev.tiers.map((t) => [t.id, t.capacity - eventSold(orders, listing, t.name)])), [orders, listing, ev.tiers]);
    const [tierId, setTierId] = useState(ev.tiers.find((t) => left[t.id]! > 0)?.id ?? '');
    const [qty, setQty] = useState(2);
    const tier = ev.tiers.find((t) => t.id === tierId);
    const max = Math.min(10, tier ? left[tier.id]! : 0);
    const n = Math.min(qty, Math.max(1, max));

    return (
        <div className="space-y-5">
            <p className="flex items-center gap-2 text-sm">
                <CalendarDaysIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                {formatDateTime(ev.startsAt)} to {formatTime(ev.endsAt)}, {ev.place}
            </p>
            <RadioGroup value={tierId} onValueChange={setTierId} aria-label="Ticket type" className="gap-2">
                {ev.tiers.map((t) => (
                    <OptionRow key={t.id} value={t.id} disabled={left[t.id]! <= 0}>
                        <span className="min-w-0">
                            <span className="block font-semibold">{t.name}</span>
                            <span className="block text-sm text-muted-foreground">{t.includes}</span>
                        </span>
                        <span className="shrink-0 text-right">
                            <span className="block font-semibold tabular">{tsh(t.price)}</span>
                            <Left n={left[t.id]!} of={t.capacity} />
                        </span>
                    </OptionRow>
                ))}
            </RadioGroup>
            <div className="flex items-center justify-between">
                <span className="font-medium">Tickets</span>
                <Stepper value={n} onChange={setQty} max={Math.max(1, max)} label="Tickets" />
            </div>
            <Total amount={(tier?.price ?? 0) * n} />
            <Button size="xl" className="w-full" disabled={!tier || max <= 0} onClick={() => proceed(`/checkout?listing=${listing.slug}&tier=${tierId}&qty=${n}`)}>
                Continue to payment
            </Button>
        </div>
    );
}

function VenueBox({ listing, signals }: { listing: Listing; signals: Signals }) {
    const orders = useApp((s) => s.orders);
    const proceed = useProceed();
    const v = listing.venue!;
    const days = nextDays(14);
    const [day, setDay] = useState(isoDay(days.find((d) => !v.closedOn.includes(d.getDay())) ?? days[0]!));
    const [optionId, setOptionId] = useState(v.options[0]!.id);
    const [qty, setQty] = useState(2);
    const option = v.options.find((o) => o.id === optionId)!;
    const perPerson = option.price === option.deposit;
    const left = option.perDay - venueBooked(orders, listing, option.name, day);
    const n = perPerson ? Math.min(qty, Math.max(1, left)) : 1;

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <p className="font-medium">When are you going?</p>
                <DayChips
                    days={days}
                    value={day}
                    onChange={setDay}
                    isDisabled={(d) => v.closedOn.includes(d.getDay())}
                    sub={(d) => (v.closedOn.includes(d.getDay()) ? 'Closed' : busynessOn(signals, d.getDay()))}
                />
                <p className="text-sm text-muted-foreground">How busy each day usually gets. Open {v.opens} to {v.closes}.</p>
            </div>
            <RadioGroup value={optionId} onValueChange={setOptionId} aria-label="What would you like" className="gap-2">
                {v.options.map((o) => {
                    const l = o.perDay - venueBooked(orders, listing, o.name, day);
                    return (
                        <OptionRow key={o.id} value={o.id} disabled={l <= 0}>
                            <span className="min-w-0">
                                <span className="block font-semibold">{o.name}</span>
                                <span className="block text-sm text-muted-foreground">{o.includes}</span>
                                {o.deposit < o.price && <span className="block text-sm text-muted-foreground">{tsh(o.deposit)} deposit now, comes off the bill</span>}
                            </span>
                            <span className="shrink-0 text-right">
                                <span className="block font-semibold tabular">{tsh(o.price)}</span>
                                <Left n={l} of={o.perDay} />
                            </span>
                        </OptionRow>
                    );
                })}
            </RadioGroup>
            {perPerson && (
                <div className="flex items-center justify-between">
                    <span className="font-medium">People</span>
                    <Stepper value={n} onChange={setQty} max={Math.max(1, Math.min(10, left))} label="People" />
                </div>
            )}
            <Total label="Pay now" amount={option.deposit * n} note={option.deposit < option.price ? `${tsh((option.price - option.deposit) * n)} on the day` : undefined} />
            <Button size="xl" className="w-full" disabled={left <= 0} onClick={() => proceed(`/checkout?listing=${listing.slug}&option=${optionId}&date=${day}&qty=${n}`)}>
                Continue to payment
            </Button>
        </div>
    );
}

function ServiceBox({ listing }: { listing: Listing }) {
    const orders = useApp((s) => s.orders);
    const proceed = useProceed();
    const sv = listing.service!;
    const days = nextDays(14).filter((d) => {
        if (!sv.days.includes(d.getDay())) return false;
        // Today only if a slot is still ahead.
        return isoDay(d) !== isoDay(Date.now()) || sv.times.some((t) => new Date(`${isoDay(d)}T${t}:00`).getTime() > Date.now());
    });
    const [day, setDay] = useState(days[0] ? isoDay(days[0]) : '');
    const [time, setTime] = useState(sv.times[0]!);
    const [guests, setGuests] = useState(2);
    const slotLeft = (t: string) => sv.capacity - serviceBooked(orders, listing, day, t);
    const slotPast = (t: string) => new Date(`${day}T${t}:00`).getTime() <= Date.now();
    const left = slotLeft(time);
    const max = Math.max(1, Math.min(sv.maxGroup, left));
    const n = Math.min(guests, max);

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <p className="font-medium">Pick a date</p>
                <DayChips days={days} value={day} onChange={setDay} isDisabled={() => false} sub={() => sv.times.length > 1 ? `${sv.times.length} times` : sv.times[0]!} />
            </div>
            <div className="space-y-2">
                <p className="font-medium">Pick a time</p>
                <RadioGroup value={time} onValueChange={setTime} aria-label="Time" className="grid grid-cols-2 gap-2">
                    {sv.times.map((t) => (
                        <OptionRow key={t} value={t} disabled={slotLeft(t) <= 0 || slotPast(t)}>
                            <span className="font-semibold tabular">{t}</span>
                            {slotPast(t) ? <span className="text-sm text-muted-foreground">Started</span> : <Left n={slotLeft(t)} of={sv.capacity} />}
                        </OptionRow>
                    ))}
                </RadioGroup>
            </div>
            <div className="flex items-center justify-between">
                <span>
                    <span className="block font-medium">Group size</span>
                    <span className="block text-sm text-muted-foreground">Up to {sv.maxGroup} per booking</span>
                </span>
                <Stepper value={n} onChange={setGuests} max={max} label="People" />
            </div>
            <Total amount={sv.pricePerPerson * n} note={`${tsh(sv.pricePerPerson)} per person`} />
            <Button size="xl" className="w-full" disabled={!day || left <= 0 || slotPast(time)} onClick={() => proceed(`/checkout?listing=${listing.slug}&date=${day}&time=${time}&guests=${n}`)}>
                Continue to payment
            </Button>
        </div>
    );
}

function ProfessionalBox({ listing }: { listing: Listing }) {
    const orders = useApp((s) => s.orders);
    const signedIn = useApp((s) => s.session.signedIn);
    const requestHire = useApp((s) => s.requestHire);
    const pro = listing.professional!;
    const booked = useMemo(() => proBookedDays(orders, listing), [orders, listing]);
    const [date, setDate] = useState<Date | undefined>();
    const [location, setLocation] = useState('');
    const [hours, setHours] = useState('4');
    const [budget, setBudget] = useState(String(pro.rateFrom));
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [signUp, setSignUp] = useState(false);
    const [sent, setSent] = useState(false);

    const blocked = (d: Date) => d < startOfDay(Date.now() + DAY) || booked.has(isoDay(d)) || pro.unavailable.includes(isoDay(d));

    const send = () => {
        const req = requestHire({
            listingId: listing.id,
            date: new Date(`${isoDay(date!)}T18:00:00`).toISOString(),
            location: location.trim(),
            hours: Number(hours),
            budget: Number(budget),
            message: message.trim(),
        });
        setSent(true);
        toast.success('Request sent', { description: `${listing.title} usually replies within ${pro.responseHours} hours.` });
        return req;
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const next: Record<string, string> = {};
        if (!date) next.date = 'Pick a date from the calendar.';
        if (location.trim().length < 3) next.location = 'Say where the event is.';
        if (!(Number(budget) > 0)) next.budget = 'Enter your budget in shillings.';
        if (message.trim().length < 10) next.message = 'Describe the event in a sentence or two.';
        setErrors(next);
        if (Object.keys(next).length) return;
        if (!signedIn) return setSignUp(true);
        send();
    };

    if (sent) {
        return (
            <div className="space-y-4 text-center">
                <CheckCircleIcon className="mx-auto size-10 text-live" aria-hidden="true" />
                <div className="space-y-1">
                    <p className="text-lg font-semibold">Request sent</p>
                    <p className="text-muted-foreground">
                        You will see the quote in your profile, with the price, terms and an expiry date. Accept it there and pay with mobile money.
                    </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/me?tab=hire">Track your request</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-5">
            <div className="space-y-2">
                <p className="font-medium">Pick a date</p>
                <div className="rounded-xl border">
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={blocked} startMonth={new Date()} className="mx-auto" />
                </div>
                {date ? <p className="text-sm">{formatDateLong(date)}</p> : <p className="text-sm text-muted-foreground">Greyed-out dates are already booked.</p>}
                {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="hire-location">Where</Label>
                <Input id="hire-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Venue and area, like Hyatt Kilimanjaro, City Centre" aria-invalid={Boolean(errors.location)} />
                {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label htmlFor="hire-hours">Hours</Label>
                    <Select value={hours} onValueChange={setHours}>
                        <SelectTrigger id="hire-hours" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[2, 3, 4, 5, 6, 8].map((h) => (
                                <SelectItem key={h} value={String(h)}>
                                    {h} hours
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="hire-budget">Budget (TSh)</Label>
                    <Input id="hire-budget" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} aria-invalid={Boolean(errors.budget)} />
                </div>
            </div>
            {errors.budget && <p className="text-sm text-destructive">{errors.budget}</p>}
            <div className="space-y-2">
                <Label htmlFor="hire-message">About the event</Label>
                <Textarea id="hire-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Wedding reception for 150 guests. Bongo Flava and some old dansi." rows={3} aria-invalid={Boolean(errors.message)} />
                {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
            </div>
            <p className="text-sm text-muted-foreground">
                From {tsh(pro.rateFrom)} {pro.rateUnit}. Usually replies within {pro.responseHours} hours. Nothing is paid until you accept a quote.
            </p>
            <Button type="submit" size="xl" className="w-full">
                Send hire request
            </Button>
            <Dialog open={signUp} onOpenChange={setSignUp}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create your account to send this</DialogTitle>
                        <DialogDescription>Two fields. Your request is kept as you wrote it.</DialogDescription>
                    </DialogHeader>
                    <QuickRegister
                        submitLabel="Create account and send"
                        onDone={() => {
                            setSignUp(false);
                            send();
                        }}
                    />
                </DialogContent>
            </Dialog>
        </form>
    );
}

export function BookingBox({ listing, signals }: { listing: Listing; signals: Signals }) {
    if (listing.event) return <EventBox listing={listing} />;
    if (listing.venue) return <VenueBox listing={listing} signals={signals} />;
    if (listing.service) return <ServiceBox listing={listing} />;
    return <ProfessionalBox listing={listing} />;
}
