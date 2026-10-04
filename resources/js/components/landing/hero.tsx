import { Container } from '@/components/container';
import { Photo } from '@/components/listing/photo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatTime, photoUrl, tsh } from '@/lib/format';
import { listingUrl } from '@/lib/kinds';
import { usePalette } from '@/lib/palette';
import { priceFrom } from '@/lib/signals';
import { cn } from '@/lib/utils';
import type { Listing } from '@/types';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { Link } from '@inertiajs/react';
import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { fontsReady, gsap, SplitText } from './motion';

const MicStage = lazy(() => import('./mic-scene'));
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
 * The thesis, set like a cover: the name huge, a stage microphone standing in front of
 * it in 3D, the line that says what Timbuktu is in the corner, and the next real show.
 * Scrolling turns the microphone and slides the name behind it.
 */
export function Hero({ reduced, next }: { reduced: boolean; next?: Listing }) {
    const section = useRef<HTMLElement>(null);
    const progress = useRef(0);
    const liveRef = useRef(true);
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
            if (!reduced) {
                // The scroll turns the microphone (read by the scene) and slides the name behind it.
                gsap.to($('[data-hero-track]'), {
                    xPercent: -22,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top top',
                        end: 'bottom bottom',
                        scrub: true,
                        onUpdate: (self) => {
                            progress.current = self.progress;
                            const next = self.progress < 0.98;
                            if (next !== liveRef.current) {
                                liveRef.current = next;
                                setLive(next);
                            }
                        },
                    },
                });
            }
        }, el);
        return () => {
            cancelled = true;
            ctx.revert();
        };
    }, [reduced]);

    return (
        <section ref={section} data-tone="dark" className={cn('relative isolate bg-navy-950 text-white', reduced ? '' : 'h-[220vh]')}>
            <div className={cn('top-0 flex h-[100dvh] min-h-[36rem] flex-col overflow-hidden', reduced ? 'relative' : 'sticky')}>
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
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--b-950)_72%,transparent)_0%,color-mix(in_oklab,var(--b-950)_12%,transparent)_30%,color-mix(in_oklab,var(--b-950)_18%,transparent)_62%,color-mix(in_oklab,var(--b-950)_88%,transparent)_100%)]" />
                </div>
                {/* The name, huge, behind the microphone. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 overflow-hidden">
                    <div data-hero-track className="whitespace-nowrap">
                        <span data-hero-word className="block text-center font-display text-[25vw] leading-[0.8] tracking-[-0.06em] text-peri-300 md:text-[21vw]">
                            timbuktu
                        </span>
                    </div>
                </div>

                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <StageObject progress={progress} live={live} night reduced={reduced} />
                </div>

                <Container className="relative flex flex-1 flex-col justify-between pt-24 pb-8 md:pt-28 md:pb-12">
                    <div className="flex items-start justify-between gap-8">
                        <h1 data-hero-rest className="max-w-[17ch] text-[1.65rem] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[2rem]">
                            <span className="sr-only">Timbuktu: </span>
                            Every good night out in Tanzania, in one place.
                        </h1>
                        <p data-hero-rest className="hidden max-w-[24ch] pt-2 text-right text-navy-100 md:block">
                            Concerts, match days, rooftops, tours and DJs to hire. Book and pay online.
                        </p>
                    </div>

                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                        <div data-hero-rest className="flex flex-wrap items-center gap-x-6 gap-y-3">
                            <Button asChild variant="accent" size="lg" className="h-12 px-6 text-base">
                                <a href="#browse">
                                    See what’s on
                                    <ArrowRightIcon aria-hidden="true" />
                                </a>
                            </Button>
                            <Button asChild variant="link" className="px-0 text-base font-semibold text-white">
                                <Link href="/join?as=entertainer">List your events</Link>
                            </Button>
                        </div>

                        {next?.event && (
                            <Link data-hero-rest href={listingUrl(next)} className="group block w-full rounded-2xl md:w-80">
                                <Card className="flex-row items-center gap-4 rounded-2xl bg-white p-3 pr-5 text-navy-900 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.5)] ring-0">
                                <Photo photo={next.photos[0]!} width={200} ratio={1} className="size-16 shrink-0 rounded-xl" sizes="64px" eager />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm text-gray-600">
                                        Next up, {DATE.format(new Date(next.event.startsAt))}, {formatTime(next.event.startsAt)}
                                    </span>
                                    <span className="block truncate font-semibold">{next.title}</span>
                                    <span className="block text-sm text-gray-600">from {tsh(priceFrom(next))}</span>
                                </span>
                                <ArrowRightIcon className="size-5 shrink-0 text-navy-900 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                                </Card>
                            </Link>
                        )}
                    </div>
                </Container>
            </div>
        </section>
    );
}
