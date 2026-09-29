import type * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-card bg-[linear-gradient(90deg,var(--color-surface)_0%,var(--color-raised)_50%,var(--color-surface)_100%)] bg-[length:200%_100%]",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: "default" | "live" | "accent" | "quiet" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tone === "default" && "bg-tint/[0.07] text-ink",
        tone === "live" && "bg-live/12 text-live",
        tone === "accent" && "bg-accent/14 text-accent",
        tone === "quiet" && "border border-line text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-surface p-5 md:p-6", className)} {...props} />;
}

export function SectionHeading({
  title,
  hint,
  action,
  as: As = "h2",
  className,
  id,
}: {
  id?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <As id={id} className="text-xl font-semibold tracking-tight text-ink md:text-2xl">
          {title}
        </As>
        {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Progress({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-tint/[0.08]", className)}
    >
      <div
        className="h-full origin-left rounded-full bg-accent transition-transform duration-700 ease-out"
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-sm text-muted">{label}</span>
      <span className="truncate font-display text-display-md tabular text-ink">{value}</span>
      {sub ? <span className="text-sm text-muted">{sub}</span> : null}
    </div>
  );
}
