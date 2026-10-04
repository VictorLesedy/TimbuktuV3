import { EmptyState } from '@/components/empty-state';
import { QuickRegister } from '@/components/fan/quick-register';
import { Ticket } from '@/components/fan/ticket';
import { Photo } from '@/components/listing/photo';
import { GROUP_ICON } from '@/components/listing/signals-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { buildCart, cartQty, type Cart } from '@/lib/cart';
import { formatDateTime, normalisePhone, tsh } from '@/lib/format';
import { listingUrl } from '@/lib/kinds';
import { PROMOS } from '@/lib/ledger';
import { useQuery } from '@/lib/url-state';
import { cn } from '@/lib/utils';
import { useApp, useCurrentFan } from '@/store/app-store';
import { GUEST_GROUPS, NETWORKS, type GuestGroup, type Network, type Order } from '@/types';
import { CheckCircleIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon, ShoppingBagIcon, TicketIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';

type Stage = 'review' | 'confirm' | 'success' | 'declined' | 'timeout';
type Outcome = 'approve' | 'decline' | 'silent';
const WAIT = 60;

function SummaryRow({ label, value, strong, muted }: { label: ReactNode; value: ReactNode; strong?: boolean; muted?: boolean }) {
    return (
        <div className={cn('flex justify-between gap-4', strong && 'text-lg font-semibold', muted && 'text-muted-foreground')}>
            <span>{label}</span>
            <span className="tabular">{value}</span>
        </div>
    );
}

function Summary({ cart, discount, promo }: { cart: Cart; discount: number; promo: string | null }) {
    const l = cart.listing;
    return (
        <div className="space-y-5 rounded-2xl border bg-card p-5">
            <div className="flex gap-4">
                <Photo photo={l.photos[0]!} width={200} ratio={1} className="size-20 shrink-0 rounded-xl" sizes="80px" />
                <div className="min-w-0 space-y-1">
                    <Link href={listingUrl(l)} className="font-semibold hover:underline">
                        {l.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{formatDateTime(cart.visitAt)}</p>
                    <p className="text-sm text-muted-foreground">{cart.summary}</p>
                </div>
            </div>
            <div className="space-y-2 border-t pt-4">
                {cart.lines.map((line) => (
                    <SummaryRow key={line.label} label={`${line.qty} × ${line.label}`} value={tsh(line.qty * line.unitPrice)} />
                ))}
                {cart.dueOnDay > 0 && <SummaryRow label="Paid on the day" value={`− ${tsh(cart.dueOnDay)}`} muted />}
                {discount > 0 && <SummaryRow label={`Promo ${promo}`} value={`− ${tsh(discount)}`} muted />}
            </div>
            <div className="border-t pt-4">
                <SummaryRow label="Pay now" value={tsh(cart.payNow - discount)} strong />
                {cart.dueOnDay > 0 && <p className="mt-1 text-sm text-muted-foreground">The deposit comes off your bill on the day.</p>}
            </div>
        </div>
    );
}

export default function Checkout() {
    const params = useQuery();
    const listings = useApp((s) => s.listings);
    const orders = useApp((s) => s.orders);
    const hireRequests = useApp((s) => s.hireRequests);
    const signedIn = useApp((s) => s.session.signedIn);
    const referral = useApp((s) => s.session.referralCode);
    const placeOrder = useApp((s) => s.placeOrder);
    const fan = useCurrentFan();

    // The basket is frozen when the page opens, so a payment in progress isn't rebuilt under the fan.
    const [cart] = useState(() => buildCart(params, listings, orders, hireRequests));
    const [stage, setStage] = useState<Stage>('review');
    const [network, setNetwork] = useState<Network>('M-Pesa');
    const [phone, setPhone] = useState(fan.phone);
    const [phoneError, setPhoneError] = useState('');
    const [group, setGroup] = useState<GuestGroup>(() => ('guests' in cart && cart.guests === 1 ? 'Solo' : 'guests' in cart && cart.guests === 2 ? 'Couples' : 'Friends'));
    const [code, setCode] = useState('');
    const [promo, setPromo] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<Outcome>('approve');
    const [seconds, setSeconds] = useState(WAIT);
    const [order, setOrder] = useState<Order | null>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    useEffect(() => {
        if (stage !== 'confirm') return;
        if (seconds <= 0) return setStage('timeout');
        const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [stage, seconds]);

    const discount = useMemo(() => ('payNow' in cart && promo ? Math.round(cart.payNow * PROMOS[promo]!) : 0), [cart, promo]);

    if ('error' in cart) {
        return (
            <div className="mx-auto max-w-xl px-4 py-20">
                <Head title="Checkout" />
                <EmptyState
                    icon={ShoppingBagIcon}
                    title="Nothing to pay for"
                    body={cart.error}
                    action={
                        <Button asChild>
                            <Link href="/explore">See what's on</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    const total = cart.payNow - discount;

    const applyPromo = (e: FormEvent) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (PROMOS[c] && !cart.hire) {
            setPromo(c);
            toast.success(`${c} applied`, { description: `${Math.round(PROMOS[c]! * 100)}% off.` });
        } else {
            toast.error(cart.hire ? 'Promo codes do not apply to quotes' : 'That code is not valid');
        }
    };

    const pay = () => {
        const normalised = normalisePhone(phone);
        if (!normalised) {
            setPhoneError('Enter the mobile money number to charge, like 0754 123 456.');
            document.getElementById('pay-phone')?.focus();
            return;
        }
        setPhoneError('');
        // Places are checked again at payment: someone may have booked the last ones meanwhile.
        const fresh = buildCart(params, useApp.getState().listings, useApp.getState().orders, useApp.getState().hireRequests);
        if ('error' in fresh) return toast.error(fresh.error);
        const need = cart.listing.service ? cart.guests : cartQty(cart);
        if (fresh.left < need) return toast.error(fresh.left > 0 ? `Only ${fresh.left} left. Go back and change the number.` : 'Sold out while you were choosing.');

        setPhone(normalised);
        setSeconds(WAIT);
        setStage('confirm');
        timers.current.forEach(clearTimeout);
        if (outcome === 'approve') {
            timers.current = [
                setTimeout(() => {
                    const o = placeOrder({
                        listingId: cart.listing.id,
                        lines: cart.lines,
                        guests: cart.guests,
                        group: cart.hire ? 'Friends' : group,
                        subtotal: cart.subtotal,
                        discount,
                        promo: promo ?? undefined,
                        total,
                        dueOnDay: cart.dueOnDay,
                        network,
                        phone: normalised,
                        visitAt: cart.visitAt,
                        hireRequestId: cart.hire?.id,
                    });
                    setOrder(o);
                    setStage('success');
                }, 4500),
            ];
        } else if (outcome === 'decline') {
            timers.current = [setTimeout(() => setStage('declined'), 3500)];
        }
    };

    const cancel = () => {
        timers.current.forEach(clearTimeout);
        setStage('timeout');
    };

    if (stage === 'success' && order) {
        return (
            <div className="mx-auto max-w-xl space-y-8 px-4 py-12 md:py-16">
                <Head title="You're in" />
                <div className="space-y-2 text-center">
                    <CheckCircleIcon className="mx-auto size-12 text-live" aria-hidden="true" />
                    <h1 className="font-display text-3xl">{cart.hire ? 'Booking confirmed' : 'You are in'}</h1>
                    <p className="text-muted-foreground">
                        {tsh(order.total)} paid with {order.network}. {cart.hire ? `${cart.listing.title} has been told.` : 'Your ticket is saved in your profile.'}
                    </p>
                </div>
                <Ticket order={order} listing={cart.listing} />
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="flex-1">
                        <Link href={cart.hire ? '/me?tab=hire' : '/me?tab=tickets'}>{cart.hire ? 'See your hire requests' : 'See your tickets'}</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="flex-1">
                        <Link href="/explore">Find something else</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (stage === 'confirm') {
        const r = 44;
        const c = 2 * Math.PI * r;
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
                <Head title="Confirm on your phone" />
                <div className="relative size-40">
                    <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
                        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
                        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - seconds / WAIT)} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-4xl tabular" aria-live="polite">
                            {seconds}
                        </span>
                        <span className="text-sm text-muted-foreground">seconds</span>
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">
                        <DevicePhoneMobileIcon className="size-7" aria-hidden="true" />
                        Check your phone
                    </h1>
                    <p className="text-muted-foreground">
                        Approve the {tsh(total)} payment to Timbuktu in the {network} prompt on {phone}. Enter your PIN to confirm.
                    </p>
                </div>
                <Button variant="outline" onClick={cancel}>
                    Cancel payment
                </Button>
            </div>
        );
    }

    if (stage === 'declined' || stage === 'timeout') {
        const declined = stage === 'declined';
        return (
            <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
                <Head title={declined ? 'Payment declined' : 'Payment not confirmed'} />
                {declined ? <XCircleIcon className="size-12 text-destructive" aria-hidden="true" /> : <ExclamationTriangleIcon className="size-12 text-muted-foreground" aria-hidden="true" />}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">{declined ? 'The payment was declined' : 'The payment was not confirmed'}</h1>
                    <p className="text-muted-foreground">
                        {declined ? 'Your network declined it, often because of the balance or a wrong PIN.' : 'No approval arrived within 60 seconds.'} Nothing was taken and your basket is
                        just as you left it.
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button size="lg" onClick={() => setStage('review')}>
                        Try again
                    </Button>
                    <Button asChild size="lg" variant="outline">
                        <Link href={listingUrl(cart.listing)}>Back to the listing</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
            <Head title="Checkout" />
            <h1 className="mb-8 font-display text-3xl md:text-4xl">Review and pay</h1>
            <div className="grid gap-8 md:grid-cols-[1fr_22rem] md:items-start">
                <div className="space-y-8">
                    {!signedIn && (
                        <section className="space-y-4 rounded-2xl border p-5">
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold">Create your account</h2>
                                <p className="text-sm text-muted-foreground">Two fields, and your basket stays as it is.</p>
                            </div>
                            <QuickRegister
                                submitLabel="Create account"
                                onDone={() => {
                                    setPhone(useApp.getState().fans.find((f) => f.id === useApp.getState().session.fanId)!.phone);
                                    toast.success('Account created');
                                }}
                            />
                        </section>
                    )}
                    {!cart.hire && (
                        <section className="space-y-3">
                            <h2 className="text-lg font-semibold">Who is going?</h2>
                            <RadioGroup value={group} onValueChange={(v) => setGroup(v as GuestGroup)} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {GUEST_GROUPS.map((g) => {
                                    const Icon = GROUP_ICON[g];
                                    return (
                                        <Label key={g} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                                            <RadioGroupItem value={g} className="sr-only" />
                                            <Icon className="size-6" aria-hidden="true" />
                                            {g === 'Solo' ? 'Just me' : g}
                                        </Label>
                                    );
                                })}
                            </RadioGroup>
                            <p className="text-sm text-muted-foreground">Helps the host plan. Shown to other fans only as an overall mix.</p>
                        </section>
                    )}
                    <section className={cn('space-y-3', !signedIn && 'pointer-events-none opacity-50')} aria-disabled={!signedIn}>
                        <h2 className="text-lg font-semibold">Pay with</h2>
                        <RadioGroup value={network} onValueChange={(v) => setNetwork(v as Network)} className="grid grid-cols-2 gap-2">
                            {NETWORKS.map((n) => (
                                <Label key={n} className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                                    <RadioGroupItem value={n} />
                                    {n}
                                </Label>
                            ))}
                        </RadioGroup>
                        <div className="space-y-2 pt-2">
                            <Label htmlFor="pay-phone">Mobile money number</Label>
                            <Input id="pay-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" aria-invalid={Boolean(phoneError)} aria-describedby="pay-phone-note" />
                            <p id="pay-phone-note" className={cn('text-sm', phoneError ? 'text-destructive' : 'text-muted-foreground')}>
                                {phoneError || 'You will get a prompt on this phone to approve the payment.'}
                            </p>
                        </div>
                    </section>
                    <div className="space-y-2 rounded-xl bg-muted p-4">
                        <Label htmlFor="demo-outcome">Demo: what the phone does</Label>
                        <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
                            <SelectTrigger id="demo-outcome" className="w-full bg-background sm:w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="approve">Approves the payment</SelectItem>
                                <SelectItem value="decline">Declines it</SelectItem>
                                <SelectItem value="silent">Never answers (60 seconds)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-4 md:sticky md:top-24">
                    <Summary cart={cart} discount={discount} promo={promo} />
                    {!cart.hire && (
                        <form onSubmit={applyPromo} className="flex gap-2">
                            <Label htmlFor="promo" className="sr-only">
                                Promo code
                            </Label>
                            <Input id="promo" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo code" className="h-10 uppercase" disabled={Boolean(promo)} />
                            <Button type="submit" variant="outline" className="h-10" disabled={Boolean(promo) || !code.trim()}>
                                {promo ? 'Applied' : 'Apply'}
                            </Button>
                        </form>
                    )}
                    {referral && <p className="text-sm text-muted-foreground">Booked through ambassador code {referral}.</p>}
                    <Button size="xl" className="w-full" onClick={pay} disabled={!signedIn}>
                        <TicketIcon />
                        Pay {tsh(total)}
                    </Button>
                </div>
            </div>
        </div>
    );
}
