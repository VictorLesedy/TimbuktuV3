import { usePalette } from '@/lib/palette';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { canUseWebGL, SceneBoundary } from './hero';
import { ScrollTrigger } from './motion';

const CurtainStage = lazy(() => import('./curtain-scene'));

// Moving on screen, so ease in and out: the cloth starts gently and settles gently.
const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** How much of the hero's pin goes to the microphone before the curtain starts to close. */
export const CLOSE_FROM = 0.35;

/**
 * Satin in CSS, used until the shader has drawn its first frame and on devices without
 * WebGL. --open (0 closed, 1 open) draws each half up and out towards its top corner.
 */
function CssCurtain() {
    const cloth = {
        background:
            'radial-gradient(70% 55% at 50% 42%, color-mix(in oklab, var(--a-300) 45%, var(--b-950)) 0%, transparent 72%), ' +
            'linear-gradient(180deg, var(--b-950) 0%, color-mix(in oklab, var(--a-400) 12%, var(--b-950)) 12%, color-mix(in oklab, var(--a-400) 40%, var(--b-950)) 55%, color-mix(in oklab, var(--a-400) 22%, var(--b-950)) 100%)',
    };
    return (
        <>
            <div className="absolute inset-y-0 left-0 w-1/2 will-change-transform" style={{ ...cloth, transform: 'translate3d(calc(-100% * var(--open, 1)), calc(-35% * var(--open, 1)), 0)' }} />
            <div className="absolute inset-y-0 right-0 w-1/2 will-change-transform" style={{ ...cloth, transform: 'translate3d(calc(100% * var(--open, 1)), calc(-35% * var(--open, 1)), 0)' }} />
        </>
    );
}

/**
 * The stage curtain between the hero and the listings, fixed over the page. It closes
 * over the hero once the microphone has turned (the end of [data-curtain-close]'s pin),
 * and opens on the listings while they hold still at the top ([data-curtain-open], whose
 * data-hold says for how many viewport heights).
 */
export function Curtain() {
    const frame = useRef<HTMLDivElement>(null);
    const open = useRef(1);
    const shown = useRef(false);
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [ready, setReady] = useState(false);
    const [webgl, setWebgl] = useState<boolean | null>(null);
    const palette = usePalette();
    useEffect(() => {
        const gl = canUseWebGL();
        setWebgl(gl);
        // Fetch and compile the shader while the visitor reads the hero.
        if (!gl) return;
        void import('./curtain-scene');
        const id = window.setTimeout(() => setMounted(true), 1200);
        return () => window.clearTimeout(id);
    }, []);

    useLayoutEffect(() => {
        const hero = document.querySelector<HTMLElement>('[data-curtain-close]');
        const stage = document.querySelector<HTMLElement>('[data-curtain-open]');
        if (!hero || !stage) return;
        const hold = Number(stage.dataset.hold ?? 60);
        const state = { close: 0, open: 0 };
        const apply = () => {
            const x = state.open > 0 ? state.open : 1 - state.close;
            // The shader's cloth has fully cleared by 0.82, so it is fed 0 to 0.84: the satin
            // starts moving the moment the scroll does and is gone exactly when it ends.
            open.current = x * 0.84;
            frame.current?.style.setProperty('--open', String(x));
            const show = x < 0.999;
            if (show !== shown.current) {
                shown.current = show;
                setVisible(show);
                setMounted(true);
            }
        };
        const closing = ScrollTrigger.create({
            trigger: hero,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                state.close = inOut(clamp01((self.progress - CLOSE_FROM) / (0.985 - CLOSE_FROM)));
                apply();
            },
        });
        const opening = ScrollTrigger.create({
            trigger: stage,
            start: 'top top',
            end: `top -${hold}%`,
            onUpdate: (self) => {
                state.open = self.progress <= 0 ? 0 : inOut(self.progress);
                apply();
            },
            onLeaveBack: () => {
                state.open = 0;
                apply();
            },
        });
        return () => {
            closing.kill();
            opening.kill();
        };
    }, []);

    return (
        <div ref={frame} aria-hidden="true" className="pointer-events-none fixed inset-0 z-40" style={{ visibility: visible ? 'visible' : 'hidden' }}>
            {(!webgl || !ready) && <CssCurtain />}
            {webgl && mounted && (
                <SceneBoundary onFail={() => setWebgl(false)}>
                    <Suspense fallback={null}>
                        <div className="absolute inset-0">
                            <CurtainStage key={palette} open={open} live={visible || !ready} onReady={() => setReady(true)} />
                        </div>
                    </Suspense>
                </SceneBoundary>
            )}
        </div>
    );
}
