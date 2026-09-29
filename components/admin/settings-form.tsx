"use client";

import * as React from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { OptionCard, OptionGroup, Switch } from "@/components/ui/controls";
import { Field, Input, Label } from "@/components/ui/field";
import { Card, Skeleton } from "@/components/ui/misc";
import { ErrorState } from "@/components/ui/states";
import { errorMessage, useSettings, useUpdateSettings } from "@/lib/queries";
import type { ActivationType, Settings } from "@/lib/schemas";
import { t } from "@/messages/en";

const s = t.admin.settings;
const TYPES: ActivationType[] = ["event", "venue", "service", "professional"];

/** Percent inputs are edited as whole numbers and stored as fractions. */
type FormState = {
  commission: Record<ActivationType, string>;
  government: string;
  partner: string;
  ambassador: string;
  crowdEnabled: boolean;
  threshold: string;
  gate: Settings["registrationGate"];
};

const pct = (n: number) => String(Math.round(n * 1000) / 10);

function fromSettings(x: Settings): FormState {
  return {
    commission: {
      event: pct(x.commission.event ?? 0),
      venue: pct(x.commission.venue ?? 0),
      service: pct(x.commission.service ?? 0),
      professional: pct(x.commission.professional ?? 0),
    },
    government: pct(x.governmentShare),
    partner: pct(x.partnerShare),
    ambassador: pct(x.ambassadorRate),
    crowdEnabled: x.crowdLabels.enabled,
    threshold: String(x.crowdLabels.threshold),
    gate: x.registrationGate,
  };
}

function validate(f: FormState): { errors: Record<string, string>; value?: Settings } {
  const e: Record<string, string> = {};
  const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));
  for (const k of TYPES) {
    const v = num(f.commission[k]);
    if (!(v >= 0 && v <= 50)) e[`c-${k}`] = "Between 0 and 50%";
  }
  const g = num(f.government);
  const p = num(f.partner);
  const a = num(f.ambassador);
  if (!(g >= 0 && g <= 100)) e.government = "Between 0 and 100%";
  if (!(p >= 0 && p <= 100)) e.partner = "Between 0 and 100%";
  if (!e.government && !e.partner && g + p > 90) e.partner = "Government and partner shares together can be 90% at most";
  if (!(a >= 0 && a <= 20)) e.ambassador = "Between 0 and 20%";
  const th = num(f.threshold);
  if (!(Number.isInteger(th) && th >= 1)) e.threshold = "A whole number, 1 or more";
  if (Object.keys(e).length) return { errors: e };
  return {
    errors: {},
    value: {
      commission: Object.fromEntries(TYPES.map((k) => [k, num(f.commission[k]) / 100])) as Settings["commission"],
      governmentShare: g / 100,
      partnerShare: p / 100,
      ambassadorRate: a / 100,
      crowdLabels: { enabled: f.crowdEnabled, threshold: th },
      registrationGate: f.gate,
    },
  };
}

export function SettingsForm() {
  const q = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = React.useState<FormState | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (q.data && !form) setForm(fromSettings(q.data));
  }, [q.data, form]);

  const dirty = form && q.data ? JSON.stringify(form) !== JSON.stringify(fromSettings(q.data)) : false;

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (q.isError) {
    return (
      <>
        <PageTitle title={s.title} />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </>
    );
  }
  if (!form) {
    return (
      <>
        <PageTitle title={s.title} />
        <Skeleton className="h-[600px]" />
      </>
    );
  }

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { errors: errs, value } = validate(form);
    setErrors(errs);
    if (!value) {
      toast.error("Check the highlighted fields");
      return;
    }
    try {
      const saved = await update.mutateAsync(value);
      setForm(fromSettings(saved));
      toast.success(s.saved);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const percentInput = (id: string, value: string, onChange: (v: string) => void, error?: string) => (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={0.5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className="pr-10"
      />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">
        %
      </span>
    </div>
  );

  return (
    <form onSubmit={save} noValidate className="flex max-w-3xl flex-col gap-6 pb-24">
      <PageTitle title={s.title} />

      <Card className="flex flex-col gap-5">
        <div>
          <h2 className="font-semibold">{s.commission}</h2>
          <p className="text-sm text-muted">{s.commissionHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {TYPES.map((k) => (
            <Field key={k} label={t.types[k].many} htmlFor={`c-${k}`} error={errors[`c-${k}`]}>
              {percentInput(`c-${k}`, form.commission[k], (v) => set({ commission: { ...form.commission, [k]: v } }), errors[`c-${k}`])}
            </Field>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <h2 className="font-semibold">{s.splits}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={s.government} htmlFor="gov" error={errors.government}>
            {percentInput("gov", form.government, (v) => set({ government: v }), errors.government)}
          </Field>
          <Field label={s.partner} htmlFor="partner" error={errors.partner}>
            {percentInput("partner", form.partner, (v) => set({ partner: v }), errors.partner)}
          </Field>
          <Field label={s.ambassador} htmlFor="amb" error={errors.ambassador}>
            {percentInput("amb", form.ambassador, (v) => set({ ambassador: v }), errors.ambassador)}
          </Field>
        </div>
      </Card>

      <Card className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="crowd">{s.crowd}</Label>
            <p className="text-sm text-muted">{s.crowdHint}</p>
          </div>
          <Switch id="crowd" checked={form.crowdEnabled} onCheckedChange={(v) => set({ crowdEnabled: v })} />
        </div>
        <Field label={s.threshold} htmlFor="threshold" error={errors.threshold} className="max-w-xs">
          <Input
            id="threshold"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.threshold}
            disabled={!form.crowdEnabled}
            onChange={(e) => set({ threshold: e.target.value })}
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-5">
        <div>
          <h2 className="font-semibold">{s.gate}</h2>
          <p className="text-sm text-muted">{s.gateHint}</p>
        </div>
        <OptionGroup
          value={form.gate}
          onValueChange={(v) => set({ gate: v as Settings["registrationGate"] })}
          aria-label={s.gate}
          className="grid gap-2 sm:grid-cols-2"
        >
          {(["atCheckout", "beforeSelection"] as const).map((g) => (
            <OptionCard key={g} value={g}>
              <span className="text-sm font-medium">{s.gates[g]}</span>
            </OptionCard>
          ))}
        </OptionGroup>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 backdrop-blur-md md:left-[248px]">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-5 py-3 pr-40 md:px-10 md:pr-48">
          <p className="text-sm text-muted" aria-live="polite">
            {dirty ? s.unsaved : "\u00a0"}
          </p>
          <Button type="submit" disabled={!dirty || update.isPending}>
            {update.isPending ? "Saving" : s.save}
          </Button>
        </div>
      </div>
    </form>
  );
}
