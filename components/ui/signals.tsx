"use client";

import { Heart, Star } from "lucide-react";
import { animate, motion, useReducedMotion } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** The breathing dot. Reserved for activations that are busy right now. */
export function LiveDot({ className, label }: { className?: string; label?: string }) {
  const dot = (
    <>
      <span className="absolute inset-0 animate-breathe rounded-full bg-live" />
      <span className="relative size-2 rounded-full bg-live" />
    </>
  );
  const cls = cn("relative inline-flex size-2 shrink-0", className);
  return label ? (
    <span className={cls} role="img" aria-label={label}>
      {dot}
    </span>
  ) : (
    <span className={cls} aria-hidden="true">
      {dot}
    </span>
  );
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("en-US");

/** Counts to a new value when live data changes. */
export function NumberTicker({
  value,
  format = defaultFormat,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const previous = React.useRef(value);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current;
    previous.current = value;
    if (reduce || from === value) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, format, reduce]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {format(value)}
    </span>
  );
}

export function Rating({
  value,
  count,
  size = "md",
  className,
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!value) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-ink", size === "sm" ? "text-sm" : "text-base", className)}>
      <Star aria-hidden="true" className={cn("fill-accent text-accent", size === "sm" ? "size-3.5" : "size-4")} />
      <span className="font-medium tabular">{value.toFixed(1)}</span>
      <span className="sr-only">out of 5</span>
      {count !== undefined ? <span className="text-muted tabular">({count})</span> : null}
    </span>
  );
}

export function StarInput({
  value,
  onChange,
  name,
  labels,
  legend,
}: {
  value: number;
  onChange: (n: number) => void;
  name: string;
  labels: (n: number) => string;
  legend: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-full p-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <span className="sr-only">{labels(n)}</span>
            <Star aria-hidden="true" className={cn("size-8 transition-colors", n <= value ? "fill-accent text-accent" : "text-muted/60")} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The save heart. Pops when filled, stays still when emptied. */
export function HeartIcon({ filled }: { filled: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      key={filled ? "on" : "off"}
      initial={reduce || !filled ? false : { scale: 0.55 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 14 }}
      className="grid place-items-center"
    >
      <Heart aria-hidden="true" className={cn("size-5 transition-colors", filled ? "fill-accent text-accent" : "text-ink")} />
    </motion.span>
  );
}
