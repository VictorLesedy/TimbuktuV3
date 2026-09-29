"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LiveDot, NumberTicker } from "@/components/ui/signals";
import { THEMES } from "@/lib/theme";
import { t } from "@/messages/en";

/* ---------------------------------------------------------------------------
   EASY-TO-CHANGE SETTINGS
   These are Tailwind classes. A class without a prefix applies to phones;
   "md:" applies from 768px wide (tablets and laptops) and overrides it.
   text-[clamp(MIN,PREFERRED,MAX)] grows with the screen but never goes below
   MIN or above MAX. "vw" is a percentage of the screen width.
   See docs/editing-the-hero.md for a walkthrough.
   --------------------------------------------------------------------------- */
const HERO = {
  /** Photo height. Phones: the screen minus the top bar and the bottom bar (4rem each).
      Laptops: the screen minus the top bar. Never below 560px. */
  height: "h-[calc(100svh-8rem-env(safe-area-inset-bottom))] min-h-[560px] md:h-[calc(100svh-4rem)]",
  /** Small Swahili greeting above the headline. */
  greeting: "text-sm md:text-lg",
  /** The big headline. */
  title: "text-[clamp(3rem,13vw,4.75rem)] md:text-[clamp(5rem,8.8vw,9.5rem)]",
  /** The paragraph under the headline. */
  body: "text-base md:text-2xl md:leading-snug",
  /** How wide the paragraph may get before it wraps. */
  bodyWidth: "max-w-lg md:max-w-2xl",
  /** The call-to-action button. */
  button: "md:h-14 md:px-8 md:text-lg",
  /** The "happening now" line next to the button. */
  live: "text-sm md:text-lg",
};

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Home hero. Each theme has its own photo (set in app/globals.css) and words
 * (set in messages/en.ts). All three text versions are rendered and CSS shows
 * the one for the active theme, so the right words appear on first paint.
 */
export function Hero({ liveCount }: { liveCount: number | null }) {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce ? {} : { initial: { y: "105%" }, animate: { y: "0%" }, transition: { duration: 0.9, ease, delay } };
  const fade = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease, delay } };

  return (
    <section className={`relative isolate overflow-hidden ${HERO.height}`}>
      {/* The photo fills the whole hero. */}
      <motion.div
        aria-hidden="true"
        className="hero-art absolute inset-0 -z-10"
        {...(reduce
          ? {}
          : { initial: { opacity: 0, scale: 1.04 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 1.4, ease } })}
      />
      {/* A soft shade behind the words so they stay readable. */}
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />

      <div className="hero-copy mx-auto flex h-full max-w-[1440px] flex-col justify-end px-5 pb-10 md:px-12 md:pb-20">
        {THEMES.map((name) => {
          const copy = t.home.hero[name];
          return (
            <div key={name} data-for={name} className="hero-variant">
              <motion.p className={`mb-4 font-medium tracking-wide opacity-85 md:mb-6 ${HERO.greeting}`} {...fade(0.05)}>
                {copy.greeting}
              </motion.p>
              <h1 className={`font-display leading-[0.9] ${HERO.title}`}>
                {copy.title.map((line, i) => (
                  <span key={line} className="block overflow-hidden pb-[0.04em]">
                    <motion.span className="block" {...rise(0.1 + i * 0.12)}>
                      {line}
                    </motion.span>{" "}
                  </span>
                ))}
              </h1>
              <motion.div className={`mt-6 flex flex-col gap-6 md:mt-8 md:gap-8 ${HERO.bodyWidth}`} {...fade(0.5)}>
                <p className={`text-pretty opacity-90 ${HERO.body}`}>{copy.body}</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Button asChild size="lg" className={HERO.button}>
                    <Link href="/explore">
                      {copy.cta}
                      <ArrowRight />
                    </Link>
                  </Button>
                  {liveCount !== null && liveCount > 0 ? (
                    <p className={`flex items-center gap-2.5 opacity-90 ${HERO.live}`}>
                      <LiveDot />
                      <span>
                        <NumberTicker value={liveCount} /> {t.home.liveNow.toLowerCase()}
                      </span>
                    </p>
                  ) : null}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
