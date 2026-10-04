import { BusyWeek } from '@/components/landing/busy-week';
import { Entertainers, Faq, Finale, LandingFooter } from '@/components/landing/closing';
import { FourWays } from '@/components/landing/four-ways';
import { Hero } from '@/components/landing/hero';
import { fontsReady, gsap, ScrollTrigger, SplitText } from '@/components/landing/motion';
import { Nav } from '@/components/landing/nav';
import { Browse } from '@/components/landing/browse';
import { Turn } from '@/components/landing/turn';
import { DemoControls } from '@/components/shell/demo-controls';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { busiest, nextEvent, topRated } from '@/lib/showcase';
import { useSignals } from '@/lib/signals';
import { useApp } from '@/store/app-store';
import { Head } from '@inertiajs/react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';

/**
 * The home page: a stage microphone in front of the name over a Zanzibar festival crowd,
 * then everything that is on with filters right here, then the story of how it works
 * (the three questions, busy days, four ways to book, entertainers) and a gold ticket.
 * Every example is picked from what is live, so none depends on a particular listing.
 */
export default function Home() {
    const listings = useApp((s) => s.listings);
    const settings = useApp((s) => s.settings);
    const signals = useSignals();
    const reduced = useReducedMotion();
    const root = useRef<HTMLDivElement>(null);

    const data = useMemo(() => {
        const live = listings.filter((l) => l.status === 'live');
        const next = nextEvent(live);
        return {
            live,
            next,
            event: busiest(live, signals, 'event') ?? next,
            venue: busiest(live, signals, 'venue'),
            service: topRated(live, signals, 'service'),
            pro: topRated(live, signals, 'professional'),
        };
    }, [listings, signals]);

    useLayoutEffect(() => {
        const scope = root.current;
        if (!scope) return;
        // Overscroll at either end shows navy, not the app background.
        const html = document.documentElement;
        const previous = html.style.backgroundColor;
        html.style.backgroundColor = 'var(--b-950)';

        let lenis: Lenis | undefined;
        const tick = (time: number) => lenis?.raf(time * 1000);
        if (!reduced) {
            lenis = new Lenis({ anchors: true });
            lenis.on('scroll', () => ScrollTrigger.update());
            gsap.ticker.add(tick);
            gsap.ticker.lagSmoothing(0);
        }

        const nav = scope.querySelector<HTMLElement>('[data-nav]');
        const ctx = gsap.context(() => {
            // The header takes the tone of whichever section sits under it.
            scope.querySelectorAll<HTMLElement>(':scope > main > [data-tone]').forEach((section, i) => {
                ScrollTrigger.create({
                    trigger: section,
                    start: 'top 32px',
                    end: 'bottom 32px',
                    onToggle: (self) => {
                        if (self.isActive && nav) {
                            nav.dataset.tone = section.dataset.tone;
                            nav.dataset.solid = i === 0 && self.progress < 0.01 ? 'false' : 'true';
                        }
                    },
                    onUpdate: (self) => {
                        if (i === 0 && nav && self.isActive) nav.dataset.solid = self.progress > 0.01 ? 'true' : 'false';
                    },
                });
            });
        }, scope);

        let cancelled = false;
        void fontsReady().then(() => {
            if (cancelled) return;
            // Section headings rise out of line masks as they arrive.
            if (!reduced) {
                ctx.add(() => {
                    gsap.utils.toArray<HTMLElement>('[data-reveal-lines]', scope).forEach((heading) => {
                        SplitText.create(heading, {
                            type: 'lines',
                            mask: 'lines',
                            autoSplit: true,
                            onSplit: (self) => {
                                // Room under each line mask so descenders (g, y, p) are not cut off.
                                (self.masks as HTMLElement[]).forEach((m) => {
                                    m.style.paddingBottom = '0.14em';
                                    m.style.marginBottom = '-0.14em';
                                });
                                return gsap.from(self.lines, {
                                    yPercent: 100,
                                    duration: 1.1,
                                    ease: 'expo.out',
                                    stagger: 0.07,
                                    scrollTrigger: { trigger: heading, start: 'top 85%', toggleActions: 'play none none none' },
                                });
                            },
                        });
                    });
                });
            }
            ScrollTrigger.refresh();
        });

        return () => {
            cancelled = true;
            ctx.revert();
            html.style.backgroundColor = previous;
            if (lenis) {
                gsap.ticker.remove(tick);
                gsap.ticker.lagSmoothing(500, 33);
                lenis.destroy();
            }
        };
    }, [reduced]);

    return (
        <>
            <Head title="Concerts, rooftops, tours and DJs across Tanzania" />
            <div ref={root} className="bg-navy-950">
                <Nav />
                <main>
                    <Hero reduced={reduced} next={data.next} />
                    <Browse listings={data.live} signals={signals} />
                    <Turn event={data.event} venue={data.venue} venueSignals={data.venue ? signals.get(data.venue.id) : undefined} />
                    <BusyWeek listings={data.live} signals={signals} />
                    <FourWays event={data.event} venue={data.venue} service={data.service} pro={data.pro} signals={signals} />
                    <Entertainers settings={settings} />
                    <Faq />
                    <Finale reduced={reduced} />
                </main>
                <LandingFooter />
                <DemoControls />
            </div>
        </>
    );
}

// The landing brings its own header and footer.
Home.layout = (page: ReactNode) => page;
