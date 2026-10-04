import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
    // The same curves as --ease-out-strong and --ease-in-out-strong in app.css.
    CustomEase.create('out-strong', '0.23, 1, 0.32, 1');
    CustomEase.create('in-out-strong', '0.77, 0, 0.175, 1');
}

export { gsap, ScrollTrigger, SplitText };

/** Waits for the web fonts before measuring text, but never longer than `timeout`. */
export function fontsReady(timeout = 1500): Promise<unknown> {
    return Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, timeout))]);
}

/**
 * Scroll decides which step of a pinned scene shows; each step then plays on its own
 * clock with the strong ease-out, so a quick flick still gets the whole motion and
 * scrolling back steps back.
 */
export function scrollSteps(trigger: Element, thresholds: number[], onStep: (step: number) => void, range: { start: string; end: string }) {
    let current = -1;
    const update = (self: ScrollTrigger) => {
        const step = thresholds.filter((at) => self.progress >= at).length;
        if (step !== current) {
            current = step;
            onStep(step);
        }
    };
    return ScrollTrigger.create({ trigger, start: range.start, end: range.end, invalidateOnRefresh: true, onUpdate: update, onRefresh: update });
}
