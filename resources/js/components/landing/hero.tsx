import { Container } from '@/components/container';
import { Photo } from '@/components/listing/photo';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatTime, photoUrl, tsh } from '@/lib/format';
import { KIND_INFO, listingUrl } from '@/lib/kinds';
import { usePalette } from '@/lib/palette';
import { priceFrom } from '@/lib/signals';
import { cn } from '@/lib/utils';
import { KINDS, type Kind, type Listing } from '@/types';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CLOSE_FROM } from './curtain';
import { fontsReady, gsap, SplitText } from './motion';

const MicStage = lazy(() => import('./mic-scene'));
const HERO_KINDS: Record<Kind, string> = { event: 'Concerts and events', venue: 'Rooftops and venues', service: 'Tours and classes', professional: 'DJs and bands to hire' };
// Sauti za Busara, Stone Town, Zanzibar (photo: Nichika Sakurai, Unsplash).
const HERO_PHOTO = 'photo-1676156786479-46a5b1715f41';
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function canUseWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
        context?.getExtension('WEBGL_lose_context')?.loseContext();
        return context !== null;
    } catch {
        return false;
    }
}

/** A scene that throws (a lost context, a driver bug) never takes the page down: the photo fallback shows instead. */
export class SceneBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch() {
        this.props.onFail();
    }
    render() {
        return this.state.failed ? null : this.props.children;
    }
}

/** Where WebGL is missing: a silver saxophone, cut out of its black backdrop (Smithsonian, Unsplash). */
export function FallbackObject({ className }: { className?: string }) {
    return (
        <img
            src="/images/landing/sax-900.webp"
            srcSet="/images/landing/sax-500.webp 500w, /images/landing/sax-900.webp 900w"
            sizes="(min-width: 1024px) 18vw, 40vw"
            alt="A silver saxophone"
            width={797}
            height={2007}
            className={cn('pointer-events-none h-full w-auto select-none', className)}
        />
    );
}

/** The 3D object and its stand-ins, sized to the section it sits in. */
export function StageObject({ progress, live, night, reduced }: { progress: React.RefObject<number>; live: boolean; night?: boolean; reduced: boolean }) {
    const palette = usePalette();
    const [webgl, setWebgl] = useState<boolean | null>(null);
    const [ready, setReady] = useState(false);
    useEffect(() => setWebgl(canUseWebGL()), []);
    if (webgl === null) return null;
    if (!webgl) {
        return (
            <div className="absolute inset-x-0 top-[14%] bottom-[6%] flex justify-center">
                <FallbackObject className="-rotate-12" />
            </div>
        );
    }
    return (
        <SceneBoundary onFail={() => setWebgl(false)}>
            <Suspense fallback={null}>
                <div className={cn('absolute inset-0 transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0')}>
                    {/* Re-lit for each palette, so the chrome reflects the page's colours. */}
                    <MicStage key={palette} progress={progress} live={live} night={night} reduced={reduced} onReady={() => setReady(true)} />
                </div>
            </Suspense>
        </SceneBoundary>
    );
}

/**
 * The thesis, set like a cover: what Timbuktu is in plain words, the name huge behind a
 * stage microphone in 3D, the kinds of things you can book, and the next real show.
 * Scrolling turns the microphone and slides the name behind it, then the curtain closes.
 */
export function Hero({ reduced, next }: { reduced: boolean; next?: Listing }) {
    const section = useRef<HTMLElement>(null);
    const stage = useRef<HTMLDivElement>(null);
    const progress = useRef(0);
    const liveRef = useRef(true);
    const hiddenRef = useRef(false);
    const [live, setLive] = useState(true);

    useLayoutEffect(() => {
        const el = section.current;
        if (!el) return;
        let cancelled = false;
        const $ = gsap.utils.selector(el);
        const ctx = gsap.context(() => {
            gsap.set($('[data-hero-word]'), { autoAlpha: 0 });
            gsap.set($('[data-hero-rest]'), { autoAlpha: 0, y: 16 });
            void fontsReady().then(() => {
                if (cancelled) return;
                ctx.add(() => {
                    gsap.set($('[data-hero-word]'), { autoAlpha: 1 });
                    gsap.to($('[data-hero-rest]'), { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: reduced ? 0 : 0.45, stagger: 0.07 });
                    if (reduced) return;
                    const split = SplitText.create($('[data-hero-word]'), { type: 'chars', mask: 'chars' });
                    gsap.from(split.chars, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.04 });
                });
            });
            if (reduced) return;
            // The first part of the pin turns the microphone (read by the scene) and slides the
            // name behind it; then the curtain closes over all of it (see Curtain).
            gsap.to($('[data-hero-track]'), {
                xPercent: -22,
                ease: 'none',
                scrollTrigger: {
                    trigger: el,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true,
                    onUpdate: (self) => {
                        const p = self.progress;
                        progress.current = Math.min(1, p / CLOSE_FROM);
                        const next = p < 0.985;
                        if (next !== liveRef.current) {
                            liveRef.current = next;
                            setLive(next);
                        }
                        // Once the curtain is shut the stage goes, and the listings are underneath.
                        const hide = p > 0.985;
                        if (hide !== hiddenRef.current && stage.current) {
                            hiddenRef.current = hide;
                            stage.current.style.visibility = hide ? 'hidden' : 'visible';
                        }
                    },
                },
            });
        }, el);
        return () => {
            cancelled = true;
            ctx.revert();
        };
    }, [reduced]);

    return (
        <section ref={section} data-tone="dark" data-curtain-close className={cn('relative isolate text-white', reduced ? 'bg-navy-950' : 'z-10 h-[200vh]')}>
            <div className={cn('pointer-events-none top-0 h-[100dvh] min-h-[36rem] overflow-hidden', reduced ? 'relative' : 'sticky')}>
                <div ref={stage} className="pointer-events-auto absolute inset-0 isolate flex flex-col bg-navy-950">
                    {/* Sauti za Busara in Stone Town, in its own colours, darkened only where the words sit. */}
                    <div aria-hidden="true" className="absolute inset-0 -z-20">
                        <img
                            src={photoUrl(HERO_PHOTO, 1800)}
                            srcSet={`${photoUrl(HERO_PHOTO, 900)} 900w, ${photoUrl(HERO_PHOTO, 1800)} 1800w, ${photoUrl(HERO_PHOTO, 2600)} 2600w`}
                            sizes="100vw"
                            alt=""
                            fetchPriority="high"
                            className="size-full object-cover saturate-[1.1]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--b-950)_70%,transparent)_0%,color-mix(in_oklab,var(--b-950)_15%,transparent)_30%,color-mix(in_oklab,var(--b-950)_35%,transparent)_58%,color-mix(in_oklab,var(--b-950)_94%,transparent)_100%)]" />
                    </div>
                    {/* The name, huge, behind the microphone. */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[38%] -z-10 -translate-y-1/2 overflow-hidden md:top-[40%]">
                        <div data-hero-track className="whitespace-nowrap">
                            <span data-hero-word className="block text-center font-display text-[25vw] leading-[0.8] tracking-[-0.06em] text-peri-300 md:text-[19vw]">
                                timbuktu
                            </span>
                        </div>
                    </div>

                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <StageObject progress={progress} live={live} night reduced={reduced} />
                    </div>

                    {/* The words sit below the name like a caption: what this is, what you can book, the next show. */}
                    <Container className="relative flex flex-1 flex-col justify-end pt-20 pb-6 md:pb-10">
                        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
                            <div className="max-w-3xl space-y-5">
                                <div data-hero-rest className="space-y-3">
                                    <h1 className="text-[clamp(1.6rem,2.5vw,2.3rem)] leading-[1.1] font-semibold tracking-[-0.02em]">
                                        <span className="sr-only">Timbuktu: </span>
                                        Tickets for events across Tanzania, booked online.
                                    </h1>
                                    <p className="max-w-[54ch] text-navy-100">
                                        Concerts, match days, rooftop nights, tours and DJs to hire in Dar es Salaam, Arusha, Zanzibar and Dodoma. Pay with mobile money or a card, and your ticket comes to your phone.
                                    </p>
                                </div>
                                <nav data-hero-rest aria-label="What you can book" className="hidden flex-wrap gap-2 sm:flex">
                                    {KINDS.map((k) => {
                                        const info = KIND_INFO[k];
                                        return (
                                            <Button key={k} asChild variant="secondary" size="sm">
                                                <Link href={`/explore?kind=${k}`}>
                                                    <info.icon aria-hidden="true" />
                                                    {HERO_KINDS[k]}
                                                </Link>
                                            </Button>
                                        );
                                    })}
                                </nav>
                                <div data-hero-rest className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                    <Button asChild variant="accent" size="xl">
                                        <a href="#browse">
                                            See what’s on
                                            <ArrowRightIcon aria-hidden="true" />
                                        </a>
                                    </Button>
                                    <Button asChild variant="link" className="px-0 text-base font-semibold text-white">
                                        <Link href="/join?as=entertainer">List your events</Link>
                                    </Button>
                                </div>
                            </div>
                            {next?.event && (
                                // The next real show as a dark ticket stub: photo inset 8px, when, what, where, and the price beside the action.
                                <Link data-hero-rest href={listingUrl(next)} className="group block w-full shrink-0 rounded-[1.25rem] md:w-[25rem]">
                                    <Card className="flex-row items-stretch gap-0 rounded-[1.25rem] bg-navy-900 px-(--card-spacing) text-white shadow-[0_24px_48px_-24px_rgb(0_0_0/0.7)] ring-white/10 transition-colors duration-200 [--card-spacing:--spacing(2)] group-hover:bg-navy-800">
                                        <Photo photo={next.photos[0]!} width={240} ratio={1} className="aspect-auto! w-24 shrink-0 rounded-[0.75rem] sm:w-28" sizes="112px" eager />
                                        <span className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1.5 pr-1.5 pl-4">
                                            <span className="block">
                                                <span className="block text-sm text-peri-200 tabular">
                                                    Next up · {DATE.format(new Date(next.event.startsAt))}, {formatTime(next.event.startsAt)}
                                                </span>
                                                <span className="mt-1 block truncate text-base font-semibold">{next.title}</span>
                                                <span className="block truncate text-sm text-navy-200">{next.event.place}</span>
                                            </span>
                                            <span className="flex items-center justify-between gap-3">
                                                <span className="text-sm whitespace-nowrap">
                                                    <span className="text-navy-200">From </span>
                                                    <span className="font-semibold tabular">{tsh(priceFrom(next))}</span>
                                                </span>
                                                <span className={buttonVariants({ variant: 'accent', size: 'sm' })}>
                                                    Get tickets
                                                    <ArrowRightIcon className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
                                                </span>
                                            </span>
                                        </span>
                                    </Card>
                                </Link>
                            )}
                        </div>
                    </Container>
                </div>

            </div>
        </section>
    );
}
