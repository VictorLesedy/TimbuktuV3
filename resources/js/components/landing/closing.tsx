import { Container } from '@/components/container';
import { Mark } from '@/components/shell/wordmark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PHOTOS } from '@/data/photos';
import { DAY, pct, photoUrl, startOfDay, tsh } from '@/lib/format';
import { useSignals } from '@/lib/signals';
import { useHostData } from '@/lib/studio';
import { cn } from '@/lib/utils';
import { useApp } from '@/store/app-store';
import type { Settings } from '@/types';
import { ArrowRightIcon, CheckCircleIcon, StarIcon, XCircleIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { canUseWebGL, SceneBoundary } from './hero';
import { gsap } from './motion';

const TicketStage = lazy(() => import('./ticket-scene'));
// Photo: Magnus Lunay, Unsplash.
const STAGE = PHOTOS.emptyStage;

/** For entertainers: what the studio shows, from the signed-in host's real numbers, and what selling costs. */
export function Entertainers({ settings }: { settings: Settings }) {
    const { listings, orders } = useHostData();
    const allPayouts = useApp((s) => s.payouts);
    const hostId = useApp((s) => s.session.hostId);
    const signals = useSignals();
    const data = useMemo(() => {
        const from = startOfDay(Date.now() - ((new Date().getDay() + 6) % 7) * DAY).getTime();
        const week = orders.filter((o) => new Date(o.createdAt).getTime() >= from);
        const payout = allPayouts.filter((p) => p.party === 'host' && p.ownerId === hostId).at(-1);
        const rated = listings.map((l) => signals.get(l.id)?.rating).filter((r): r is { average: number; count: number } => Boolean(r && r.count));
        const reviews = rated.reduce((s, r) => s + r.count, 0);
        const average = reviews ? rated.reduce((s, r) => s + r.average * r.count, 0) / reviews : 0;
        return { amount: week.reduce((s, o) => s + o.total, 0), count: week.length, live: listings.filter((l) => l.status === 'live').length, payout, average, reviews };
    }, [orders, allPayouts, hostId, listings, signals]);
    const rates = Object.values(settings.commission);
    const low = Math.min(...rates);
    const high = Math.max(...rates);

    return (
        <section data-tone="dark" className="relative isolate overflow-hidden bg-navy-950 py-24 text-white md:py-32">
            {/* An empty stage, lit and waiting for the show; darkest behind the words. */}
            <div aria-hidden="true" className="absolute inset-0 -z-10">
                <img
                    src={photoUrl(STAGE.src, 1600)}
                    srcSet={`${photoUrl(STAGE.src, 900)} 900w, ${photoUrl(STAGE.src, 1600)} 1600w, ${photoUrl(STAGE.src, 2400)} 2400w`}
                    sizes="100vw"
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--b-950)_92%,transparent)_0%,color-mix(in_oklab,var(--b-950)_70%,transparent)_45%,color-mix(in_oklab,var(--b-950)_35%,transparent)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--b-950)_0%,transparent_22%,transparent_78%,var(--b-950)_100%)]" />
            </div>
            <Container className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-20">
                <div>
                    <h2 data-reveal-lines className="max-w-[13ch] font-display text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1]">
                        Run a venue, a show or a tour? Sell it here.
                    </h2>
                    <p className="mt-6 max-w-[42ch] text-lg text-peri-100">
                        Venues, promoters, tour operators, DJs and bands get a studio: list in six steps, take bookings and payments, scan guests in at the door, see who comes, and withdraw to mobile money.
                    </p>
                    <p className="mt-4 max-w-[42ch] text-peri-200">
                        {low === high ? `A ${pct(low)} commission` : `A commission of ${pct(low)} to ${pct(high)}`} on each sale, taken before payout. No monthly fee, and fans pay nothing extra.
                    </p>
                    <Button asChild variant="accent" size="xl" className="mt-8">
                        <Link href="/join?as=entertainer">
                            List your events
                            <ArrowRightIcon aria-hidden="true" />
                        </Link>
                    </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2" aria-label="What the studio shows, from a sample entertainer">
                    <Card className="rounded-2xl bg-navy-800 px-6 text-white ring-0 sm:col-span-2">
                        <p className="text-sm text-peri-200">Sales this week</p>
                        <p className="font-display text-5xl tabular md:text-6xl">{tsh(data.amount)}</p>
                        <p className="text-peri-200">
                            {data.count} {data.count === 1 ? 'order' : 'orders'} across {data.live} live {data.live === 1 ? 'listing' : 'listings'}
                        </p>
                    </Card>
                    <Card className="gap-3 rounded-2xl bg-white px-6 text-navy-900 ring-0">
                        <p className="text-sm text-gray-600">Door check-in</p>
                        <p className="flex items-start gap-2 font-semibold">
                            <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
                            Ticket scanned, 2 guests in
                        </p>
                        <p className="flex items-start gap-2 font-semibold">
                            <XCircleIcon className="mt-0.5 size-5 shrink-0 text-rose-600" aria-hidden="true" />
                            Same code again: refused
                        </p>
                    </Card>
                    <Card className="rounded-2xl bg-peri-300 px-6 text-on-peri ring-0">
                        <p className="text-sm">Last withdrawal</p>
                        <p className="font-display text-4xl tabular">{tsh(data.payout?.amount ?? 0)}</p>
                        <p className="text-sm">{data.payout ? `To ${data.payout.network}` : 'No withdrawals yet'}</p>
                    </Card>
                    {data.reviews > 0 && (
                        <Card className="flex-row items-center justify-between gap-4 rounded-2xl bg-navy-800 px-6 text-white ring-0 sm:col-span-2">
                            <div>
                                <p className="text-sm text-peri-200">Rating from scanned-in guests</p>
                                <p className="mt-1 flex items-center gap-2 font-display text-4xl tabular">
                                    <StarIcon className="size-7 text-peri-300" aria-hidden="true" />
                                    {data.average.toFixed(1)}
                                </p>
                            </div>
                            <p className="text-right text-peri-200">{data.reviews} verified reviews</p>
                        </Card>
                    )}
                </div>
            </Container>
        </section>
    );
}

const FAQ: [string, string][] = [
    ['How do I pay?', 'Online, with mobile money (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa) or a bank card.'],
    ['What if my payment fails?', 'Nothing is taken. If it is declined or not approved in time, your basket stays as it was and you can try again.'],
    ['Where is my ticket?', 'It appears as soon as you have paid and stays in your profile, with the QR code staff scan at the gate.'],
    ['Can someone else use my ticket?', 'Each code works once. When it is scanned at the gate, any later scan of the same code is refused.'],
    ['Are the reviews real?', 'Only guests who were scanned in at the door can leave one, so every rating comes from someone who went.'],
    ['Does it cost anything to book?', 'No. You pay the price on the listing, nothing added.'],
];

export function Faq() {
    return (
        <section data-tone="light" className="bg-gray-50 py-24 text-navy-900 md:py-32">
            <Container className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
                <h2 data-reveal-lines className="font-display text-[clamp(2.4rem,4.6vw,4.25rem)] leading-[1]">
                    Asked before booking.
                </h2>
                <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2">
                    {FAQ.map(([q, a]) => (
                        <div key={q}>
                            <dt className="text-lg font-semibold">{q}</dt>
                            <dd className="mt-2 text-gray-600">{a}</dd>
                        </div>
                    ))}
                </dl>
            </Container>
        </section>
    );
}

/** The close: a gold satin ticket that shakes as you scroll to it, and the same action once more. */
export function Finale({ reduced }: { reduced: boolean }) {
    const section = useRef<HTMLElement>(null);
    const progress = useRef(0);
    const [near, setNear] = useState(false);
    const [webgl, setWebgl] = useState<boolean | null>(null);
    const [ready, setReady] = useState(false);
    useEffect(() => setWebgl(canUseWebGL()), []);
    // The canvas mounts as the close approaches and only runs while it is on screen.
    useEffect(() => {
        const el = section.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setNear(Boolean(e?.isIntersecting)), { rootMargin: '300px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    useLayoutEffect(() => {
        const el = section.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            gsap.to(progress, { current: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        }, el);
        return () => ctx.revert();
    }, []);

    return (
        <section ref={section} data-tone="dark" className="relative isolate overflow-hidden bg-navy-950 text-white">
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(50%_60%_at_70%_50%,color-mix(in_oklab,var(--a-400)_24%,var(--b-950))_0%,transparent_70%)]">
                {near && webgl && (
                    <SceneBoundary onFail={() => setWebgl(false)}>
                        <Suspense fallback={null}>
                            <div className={cn('absolute inset-0 transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0')}>
                                <TicketStage progress={progress} live={near} reduced={reduced} onReady={() => setReady(true)} />
                            </div>
                        </Suspense>
                    </SceneBoundary>
                )}
            </div>
            <Container className="flex min-h-[100dvh] flex-col justify-end pt-[48vh] pb-16 md:justify-center md:pt-24">
                <div className="max-w-md">
                    <h2 data-reveal-lines className="font-display text-[clamp(2.6rem,5.4vw,5rem)] leading-[1]">
                        <span lang="sw">Karibu.</span> Your ticket is waiting.
                    </h2>
                    <p className="mt-5 max-w-[36ch] text-lg text-peri-100">Find something on this weekend, pay online, and show the code at the gate.</p>
                    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <Button asChild variant="accent" size="xl">
                            <a href="#browse">
                                See what’s on
                                <ArrowRightIcon aria-hidden="true" />
                            </a>
                        </Button>
                        <Button asChild variant="link" className="px-0 text-base font-semibold text-white">
                            <Link href="/join">Create a free account</Link>
                        </Button>
                    </div>
                </div>
            </Container>
        </section>
    );
}

export function LandingFooter() {
    const cols: [string, [string, string][]][] = [
        ['Going out', [['Explore', '/explore'], ['Your tickets', '/me?tab=tickets'], ['Ambassadors', '/me/ambassador'], ['Sign up', '/join']]],
        ['Entertainers', [['Studio', '/studio'], ['Create a listing', '/studio/listings/new'], ['Door check-in', '/studio/check-in'], ['Join', '/join?as=entertainer']]],
        ['Cities', [['Dar es Salaam', '/explore?city=Dar+es+Salaam'], ['Arusha', '/explore?city=Arusha'], ['Zanzibar', '/explore?city=Zanzibar'], ['Dodoma', '/explore?city=Dodoma']]],
    ];
    return (
        <footer className="border-t border-white/10 bg-navy-950 text-white">
            <Container className="grid gap-12 pt-16 pb-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
                <div className="space-y-4">
                    <Link href="/" className="flex items-center gap-3" aria-label="Timbuktu home">
                        <Mark className="size-10 text-peri-300" />
                        <span className="font-display text-4xl">timbuktu</span>
                    </Link>
                    <p className="max-w-xs text-peri-200">Every kind of good time in Tanzania, in one place. Prices in shillings, paid online.</p>
                </div>
                {cols.map(([title, links]) => (
                    <div key={title} className="space-y-4">
                        <h2 className="text-sm font-semibold text-peri-200">{title}</h2>
                        <ul className="space-y-2.5">
                            {links.map(([label, href]) => (
                                <li key={href}>
                                    <Link href={href} className="rounded-sm hover:text-peri-300">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </Container>
            <Container className="pb-10">
                <p className="text-sm text-peri-200">Sample listings for the demo. Photos from Unsplash, credited on each listing.</p>
            </Container>
        </footer>
    );
}
