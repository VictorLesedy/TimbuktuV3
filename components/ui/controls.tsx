"use client";

import { Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Popover as P, RadioGroup as RG, Slider as S, Switch as SW, Tabs as T } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

/* ---------- Tabs with a sliding indicator ---------- */

export const Tabs = T.Root;

export function TabsContent({ className, ...props }: React.ComponentProps<typeof T.Content>) {
  return <T.Content className={cn("focus-visible:outline-none", className)} {...props} />;
}

export function TabsList({
  items,
  value,
  className,
  label,
}: {
  items: { value: string; label: string; count?: number }[];
  value: string;
  className?: string;
  label: string;
}) {
  const id = React.useId();
  const reduce = useReducedMotion();
  return (
    <T.List aria-label={label} className={cn("scrollbar-none -mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:px-0", className)}>
      {items.map((item) => (
        <T.Trigger
          key={item.value}
          value={item.value}
          className="relative h-10 shrink-0 rounded-full px-4 text-sm font-medium text-muted transition-colors hover:text-ink data-[state=active]:text-canvas"
        >
          {value === item.value ? (
            <motion.span
              layoutId={`tab-pill-${id}`}
              className="absolute inset-0 rounded-full bg-ink"
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
            />
          ) : null}
          <span className="relative">
            {item.label}
            {item.count !== undefined ? <span className="ml-1.5 tabular opacity-70">{item.count}</span> : null}
          </span>
        </T.Trigger>
      ))}
    </T.List>
  );
}

/* ---------- Segmented choice ---------- */

export function Segmented<V extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string }[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <RG.Root
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as V)}
      orientation="horizontal"
      className={cn("inline-flex max-w-full overflow-x-auto rounded-full bg-canvas/60 p-1 scrollbar-none", className)}
    >
      {options.map((o) => (
        <RG.Item
          key={o.value}
          value={o.value}
          className={cn(
            "shrink-0 rounded-full font-medium text-muted transition-colors hover:text-ink data-[state=checked]:bg-raised data-[state=checked]:text-ink",
            size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm",
          )}
        >
          {o.label}
        </RG.Item>
      ))}
    </RG.Root>
  );
}

/* ---------- Option cards ---------- */

export function OptionGroup({ className, ...props }: React.ComponentProps<typeof RG.Root>) {
  return <RG.Root className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function OptionCard({
  value,
  disabled,
  className,
  children,
}: {
  value: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <RG.Item
      value={value}
      disabled={disabled}
      className={cn(
        "group w-full rounded-2xl border border-line bg-canvas/40 p-4 text-left transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent/[0.06]",
        className,
      )}
    >
      {children}
    </RG.Item>
  );
}

/* ---------- Switch ---------- */

export function Switch({ className, ...props }: React.ComponentProps<typeof SW.Root>) {
  return (
    <SW.Root
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-tint/15 transition-colors data-[state=checked]:bg-accent",
        className,
      )}
      {...props}
    >
      <SW.Thumb className="block size-5 translate-x-1 rounded-full bg-ink shadow transition-transform duration-200 data-[state=checked]:translate-x-6" />
    </SW.Root>
  );
}

/* ---------- Range slider ---------- */

export function RangeSlider({ className, labels, ...props }: React.ComponentProps<typeof S.Root> & { labels: string[] }) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <S.Root className={cn("relative flex h-6 w-full touch-none items-center select-none", className)} {...props}>
      <S.Track className="relative h-1 grow rounded-full bg-tint/12">
        <S.Range className="absolute h-full rounded-full bg-accent" />
      </S.Track>
      {Array.from({ length: count }, (_, i) => (
        <S.Thumb
          key={i}
          aria-label={labels[i]}
          className="block size-6 rounded-full border-2 border-accent bg-canvas transition-transform hover:scale-110 focus-visible:scale-110"
        />
      ))}
    </S.Root>
  );
}

/* ---------- Quantity stepper ---------- */

export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-canvas/60 p-1" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={t.event.decrease}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="grid size-9 place-items-center rounded-full text-ink hover:bg-tint/5 disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
      <output aria-live="polite" className="w-8 text-center font-medium tabular">
        {value}
      </output>
      <button
        type="button"
        aria-label={t.event.increase}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid size-9 place-items-center rounded-full text-ink hover:bg-tint/5 disabled:opacity-30"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

/* ---------- Popover ---------- */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;

export function PopoverContent({ className, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={10}
        collisionPadding={12}
        className={cn(
          "z-50 w-80 rounded-card border border-line bg-surface p-5 shadow-[0_16px_48px_var(--color-shadow)] data-[state=closed]:animate-fade-out data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}
