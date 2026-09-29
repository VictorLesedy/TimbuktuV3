"use client";

import Link from "next/link";
import { QuickRegister } from "@/components/fan/quick-register";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useSettings } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { t } from "@/messages/en";

/** True when the admin requires an account before any selection. */
export function useSelectionGate() {
  const settings = useSettings();
  const signedIn = useAppStore((s) => s.signedIn);
  return !signedIn && settings.data?.registrationGate === "beforeSelection";
}

export function GateCard() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">{t.gate.beforeSelection}</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="lg">{t.nav.signUp}</Button>
        </DialogTrigger>
        <DialogContent title={t.gate.title} description={t.gate.body}>
          <QuickRegister compact />
        </DialogContent>
      </Dialog>
      <Link href="/onboarding" className="text-sm text-muted hover:text-ink hover:underline">
        {t.gate.fullSignup}
      </Link>
    </div>
  );
}

export function PanelTotal({ label, amount, note }: { label: string; amount: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <span className="font-display text-3xl tabular" aria-live="polite">
          {amount}
        </span>
      </div>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function StepLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2.5 text-sm font-medium">
      <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-tint/[0.08] text-xs tabular">
        {n}
      </span>
      {children}
    </h3>
  );
}

export function DateChip({
  selected,
  disabled,
  onSelect,
  top,
  day,
  bottom,
  busy,
  hot,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  top: string;
  day: number;
  bottom: string;
  busy?: number;
  hot?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={
        "flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (selected ? "border-accent bg-accent/[0.08]" : "border-line hover:border-line-strong")
      }
    >
      <span className="text-xs text-muted">{top}</span>
      <span className="font-display text-2xl leading-none tabular">{day}</span>
      <span className={`text-[11px] ${hot ? "text-live" : "text-muted"}`}>{bottom}</span>
      {busy !== undefined ? (
        <span aria-hidden="true" className="h-1 w-8 overflow-hidden rounded-full bg-tint/10">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(8, busy)}%` }} />
        </span>
      ) : null}
    </button>
  );
}
