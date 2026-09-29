"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { SmartImage } from "@/components/ui/smart-image";
import type { Media } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

export function Gallery({ media, title }: { media: Media[]; title: string }) {
  const [index, setIndex] = React.useState(0);
  const reduce = useReducedMotion();
  const current = media[index];
  if (!current) return <div className="aspect-[16/10] rounded-card bg-surface" />;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-card md:aspect-[16/9]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={current.url + index}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <SmartImage
              src={current.url}
              alt={current.alt}
              hue={current.hue}
              priority={index === 0}
              sizes="(min-width: 1024px) 720px, 100vw"
              className="size-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {media.length > 1 ? (
        <div className="flex gap-2" role="group" aria-label={`${title} photos`}>
          {media.map((m, i) => (
            <button
              key={m.url + i}
              type="button"
              aria-label={t.detail.photo(i + 1)}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-14 w-20 overflow-hidden rounded-xl transition-opacity",
                i === index ? "opacity-100 ring-2 ring-accent" : "opacity-55 hover:opacity-90",
              )}
            >
              <SmartImage src={m.url} alt="" hue={m.hue} sizes="80px" className="size-full" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
