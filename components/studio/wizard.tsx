"use client";

import { Check, ChevronLeft, ImagePlus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ActivationCard } from "@/components/activation/activation-card";
import { AvailabilityCalendar } from "@/components/activation/availability-calendar";
import { Button } from "@/components/ui/button";
import { OptionCard, OptionGroup } from "@/components/ui/controls";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Card } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { CITY_CENTER, DAYS_SHORT } from "@/lib/config";
import { formatDateTime, tsh } from "@/lib/format";
import { errorMessage, useCreateActivation } from "@/lib/queries";
import { type ActivationCard as Card_, fromPrice, type NewActivationInput, samplePhotos } from "@/lib/repo";
import type { Activation, ActivationType, Media, TableOption } from "@/lib/schemas";
import { cn, uid } from "@/lib/utils";
import { t } from "@/messages/en";

type TierRow = { id: string; name: string; price: string; capacity: string };
type TableRow = { id: string; name: string; minSpend: string; deposit: string; seats: string; kind: TableOption["kind"] };
type SlotTime = { id: string; time: string; capacity: string };

type Draft = {
  type: ActivationType;
  title: string;
  description: string;
  area: string;
  lineup: string;
  media: Media[];
  tiers: TierRow[];
  tables: TableRow[];
  pricePerPerson: string;
  durationMins: string;
  baseRate: string;
  startsAt: string;
  endsAt: string;
  hours: string;
  openDays: number[];
  slotStart: string;
  slotDays: string;
  slotTimes: SlotTime[];
  availability: string[];
};

function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function initialDraft(): Draft {
  const start = new Date(Date.now() + 10 * 86_400_000);
  start.setHours(20, 0, 0, 0);
  const end = new Date(start.getTime() + 6 * 3_600_000);
  const tomorrow = new Date(Date.now() + 86_400_000);
  return {
    type: "event",
    title: "",
    description: "",
    area: "",
    lineup: "",
    media: [],
    tiers: [
      { id: uid("tier"), name: "Early bird", price: "25000", capacity: "150" },
      { id: uid("tier"), name: "VIP", price: "80000", capacity: "40" },
    ],
    tables: [
      { id: uid("tbl"), name: "Entry", minSpend: "0", deposit: "10000", seats: "1", kind: "entry" },
      { id: uid("tbl"), name: "Table for six", minSpend: "400000", deposit: "100000", seats: "6", kind: "table" },
    ],
    pricePerPerson: "35000",
    durationMins: "120",
    baseRate: "300000",
    startsAt: localInput(start),
    endsAt: localInput(end),
    hours: "18:00–02:00",
    openDays: [3, 4, 5],
    slotStart: localInput(tomorrow).slice(0, 10),
    slotDays: "14",
    slotTimes: [
      { id: uid("st"), time: "06:00", capacity: "20" },
      { id: uid("st"), time: "17:00", capacity: "20" },
    ],
    availability: [],
  };
}

const int = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));

function validateStep(step: number, d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 1) {
    if (d.title.trim().length < 3) e.title = "Give it a title of at least 3 characters";
    if (d.description.trim().length < 20) e.description = "Describe it in at least 20 characters";
    if (d.area.trim().length < 2) e.area = "Add the area, such as Masaki";
  }
  if (step === 2 && d.media.length === 0) e.media = "Add at least one photo";
  if (step === 3) {
    if (d.type === "event") {
      if (!d.tiers.length) e.pricing = "Add at least one ticket tier";
      d.tiers.forEach((r) => {
        if (!r.name.trim()) e[`tier-${r.id}-name`] = "Name this tier";
        if (!(int(r.price) >= 0)) e[`tier-${r.id}-price`] = "Enter a price";
        if (!(int(r.capacity) >= 1)) e[`tier-${r.id}-capacity`] = "At least 1";
      });
    }
    if (d.type === "venue") {
      if (!d.tables.length) e.pricing = "Add at least one option";
      d.tables.forEach((r) => {
        if (!r.name.trim()) e[`tbl-${r.id}-name`] = "Name this option";
        if (!(int(r.deposit) >= 0)) e[`tbl-${r.id}-deposit`] = "Enter a deposit";
        if (!(int(r.seats) >= 1)) e[`tbl-${r.id}-seats`] = "At least 1";
      });
    }
    if (d.type === "service") {
      if (!(int(d.pricePerPerson) >= 0)) e.pricePerPerson = "Enter a price";
      if (!(int(d.durationMins) >= 15)) e.durationMins = "At least 15 minutes";
    }
    if (d.type === "professional" && !(int(d.baseRate) >= 10_000)) e.baseRate = "Rates start at TSh 10,000";
  }
  if (step === 4) {
    if (d.type === "event") {
      const s = new Date(d.startsAt).getTime();
      const en = new Date(d.endsAt).getTime();
      if (!(s > Date.now())) e.startsAt = "Choose a start time in the future";
      if (!(en > s)) e.endsAt = "The end must come after the start";
    }
    if (d.type === "venue") {
      if (!d.hours.trim()) e.hours = "Add opening hours";
      if (!d.openDays.length) e.openDays = "Choose at least one day";
    }
    if (d.type === "service") {
      if (!d.slotTimes.length) e.slots = "Add at least one time";
      d.slotTimes.forEach((r) => {
        if (!/^\d{2}:\d{2}$/.test(r.time)) e[`slot-${r.id}-time`] = "Pick a time";
        if (!(int(r.capacity) >= 1)) e[`slot-${r.id}-capacity`] = "At least 1";
      });
    }
    if (d.type === "professional" && !d.availability.length) e.availability = "Mark at least one available date";
  }
  return e;
}

function toInput(d: Draft, submit: boolean): NewActivationInput {
  const center = CITY_CENTER["Dar es Salaam"];
  const base: NewActivationInput = {
    type: d.type,
    title: d.title.trim(),
    description: d.description.trim(),
    media: d.media,
    location: { area: d.area.trim(), lat: center.lat + (Math.random() - 0.5) * 0.04, lng: center.lng + (Math.random() - 0.5) * 0.04 },
    submit,
  };
  if (d.type === "event") {
    base.event = {
      startsAt: new Date(d.startsAt).toISOString(),
      endsAt: new Date(d.endsAt).toISOString(),
      lineup: d.lineup
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tiers: d.tiers.map((r) => ({ id: r.id, name: r.name.trim(), price: int(r.price), capacity: int(r.capacity), sold: 0 })),
    };
  }
  if (d.type === "venue") {
    base.venue = {
      hours: d.hours.trim(),
      openDays: [...d.openDays].sort(),
      tableOptions: d.tables.map((r) => ({
        id: r.id,
        name: r.name.trim(),
        minSpend: int(r.minSpend) || 0,
        deposit: int(r.deposit),
        seats: int(r.seats),
        kind: r.kind,
      })),
    };
  }
  if (d.type === "service") {
    const start = new Date(`${d.slotStart}T00:00:00`);
    const slots = [];
    for (let i = 0; i < int(d.slotDays); i++) {
      for (const st of d.slotTimes) {
        const [h, m] = st.time.split(":").map(Number);
        const at = new Date(start.getTime() + i * 86_400_000);
        at.setHours(h ?? 0, m ?? 0, 0, 0);
        slots.push({ id: uid("slot"), startsAt: at.toISOString(), capacity: int(st.capacity), booked: 0 });
      }
    }
    base.service = { pricePerPerson: int(d.pricePerPerson), durationMins: int(d.durationMins), slots };
  }
  if (d.type === "professional") base.professional = { baseRate: int(d.baseRate), availability: [...d.availability].sort() };
  return base;
}

export function Wizard() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const create = useCreateActivation();
  const [step, setStep] = React.useState(0);
  const [d, setD] = React.useState<Draft>(initialDraft);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const heading = React.useRef<HTMLHeadingElement>(null);
  const update = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const photos = React.useMemo(() => samplePhotos(), []);
  const steps = t.wizard.steps;

  // biome-ignore lint/correctness/useExhaustiveDependencies: move focus to the heading on each step change
  React.useEffect(() => {
    heading.current?.focus();
  }, [step]);

  function go(next: number) {
    if (next > step) {
      for (let s = step; s < next; s++) {
        const e = validateStep(s, d);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(s);
          toast.error("Check the highlighted fields");
          return;
        }
      }
    }
    setErrors({});
    setStep(next);
  }

  async function save(submit: boolean) {
    for (let s = 0; s < 5; s++) {
      const e = validateStep(s, d);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        toast.error("Some steps need attention");
        return;
      }
    }
    try {
      await create.mutateAsync(toInput(d, submit));
      toast.success(submit ? t.wizard.submitted : t.wizard.draftSaved);
      router.push("/studio/activations");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const preview: Card_ | null = React.useMemo(() => {
    if (step !== 5) return null;
    const input = toInput(d, false);
    const activation: Activation = {
      ...input,
      id: "preview",
      slug: "preview",
      providerId: "",
      city: "Dar es Salaam",
      status: "draft",
      featured: false,
      createdAt: new Date().toISOString(),
    };
    const price = fromPrice(activation);
    return {
      activation,
      provider: { id: "", name: "You", category: "venue", subtype: "club", verified: true, city: "Dar es Salaam" },
      signals: {
        activationId: "preview",
        rating: 0,
        reviewCount: 0,
        repeatRate: 0,
        rhythm: Array.from({ length: 7 }, () => [0, 0, 0, 0]),
        crowd: { tierShare: { general: 0, vip: 0, table: 0 }, avgSpend: 0, sampleSize: 0 },
        momentum48h: 0,
        momentumPrev48h: 0,
        saves48h: 0,
        sales48h: 0,
        busyNow: false,
        isNew: true,
      },
      badges: [{ id: "new", label: "New on Timbuktu", live: false }],
      crowdLabel: null,
      fromPrice: Number.isFinite(price.price) ? price.price : 0,
      priceUnit: price.unit,
      score: 0,
      distanceKm: null,
      nextDate: activation.event?.startsAt ?? activation.service?.slots[0]?.startsAt ?? null,
    };
  }, [step, d]);

  const err = (k: string) => errors[k];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link href="/studio/activations" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t.studio.nav.activations}
        </Link>
        <h1 className="font-display text-display-md">{t.wizard.title}</h1>
        <ol className="scrollbar-none -mx-5 flex gap-1 overflow-x-auto px-5 md:mx-0 md:px-0" aria-label="Steps">
          {steps.map((label, i) => (
            <li key={label} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3 text-sm transition-colors",
                  i === step ? "bg-ink text-canvas" : i < step ? "text-ink hover:bg-tint/5" : "text-muted hover:bg-tint/5",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[11px] tabular",
                    i === step ? "bg-canvas text-ink" : i < step ? "bg-accent text-on-accent" : "border border-line-strong",
                  )}
                >
                  {i < step ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 5) go(step + 1);
        }}
        className="flex flex-col gap-8"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="flex max-w-3xl flex-col gap-6"
          >
            <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold focus:outline-none">
              {[t.wizard.typeTitle, "Details", t.wizard.mediaTitle, "Pricing", "Schedule", t.wizard.previewTitle][step]}
            </h2>

            {step === 0 ? (
              <OptionGroup
                value={d.type}
                onValueChange={(v) => update({ type: v as ActivationType })}
                aria-label={t.wizard.typeTitle}
                className="grid gap-3 sm:grid-cols-2"
              >
                {(["event", "venue", "service", "professional"] as const).map((k) => (
                  <OptionCard key={k} value={k} className="p-5">
                    <span className="block font-display text-2xl">{t.types[k].one}</span>
                    <span className="mt-1 block text-sm text-muted">{t.wizard.typeHints[k]}</span>
                  </OptionCard>
                ))}
              </OptionGroup>
            ) : null}

            {step === 1 ? (
              <div className="flex flex-col gap-5">
                <Field label={t.wizard.title_} htmlFor="wz-title" error={err("title")}>
                  <Input
                    id="wz-title"
                    value={d.title}
                    onChange={(e) => update({ title: e.target.value })}
                    aria-invalid={Boolean(err("title"))}
                  />
                </Field>
                <Field
                  label={t.wizard.description}
                  htmlFor="wz-desc"
                  error={err("description")}
                  hint={`${d.description.trim().length} characters`}
                >
                  <Textarea
                    id="wz-desc"
                    value={d.description}
                    onChange={(e) => update({ description: e.target.value })}
                    aria-invalid={Boolean(err("description"))}
                    className="min-h-36"
                  />
                </Field>
                <Field label={t.wizard.area} htmlFor="wz-area" error={err("area")}>
                  <Input
                    id="wz-area"
                    value={d.area}
                    onChange={(e) => update({ area: e.target.value })}
                    aria-invalid={Boolean(err("area"))}
                  />
                </Field>
                {d.type === "event" ? (
                  <Field label={t.wizard.lineup} htmlFor="wz-lineup" optional hint={t.wizard.lineupHint}>
                    <Input id="wz-lineup" value={d.lineup} onChange={(e) => update({ lineup: e.target.value })} />
                  </Field>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col gap-5">
                <p className={cn("text-sm", err("media") ? "text-live" : "text-muted")} role={err("media") ? "alert" : undefined}>
                  {err("media") ?? t.wizard.mediaHint}
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {d.media.map((m, i) => (
                    <li key={m.url} className="relative">
                      <SmartImage src={m.url} alt={m.alt} hue={m.hue} sizes="240px" className="aspect-[4/3] rounded-2xl" />
                      {i === 0 ? (
                        <span className="absolute bottom-2 left-2 rounded-full bg-canvas/80 px-2 py-0.5 text-xs">Cover</span>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`${t.wizard.removePhoto} ${i + 1}`}
                        onClick={() => update({ media: d.media.filter((x) => x.url !== m.url) })}
                        className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-canvas/80 hover:bg-canvas"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                  {d.media.length < 3 ? (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          const used = new Set(d.media.map((m) => m.url));
                          const pool = photos.filter((p) => !used.has(p.url));
                          const pick = pool[Math.floor(Math.random() * pool.length)];
                          if (pick) update({ media: [...d.media, pick] });
                        }}
                        className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm text-muted hover:border-muted hover:text-ink"
                      >
                        <ImagePlus className="size-6" aria-hidden="true" />
                        {t.wizard.addPhoto}
                      </button>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-5">
                {err("pricing") ? (
                  <p role="alert" className="text-sm text-live">
                    {err("pricing")}
                  </p>
                ) : null}
                {d.type === "event" ? (
                  <Repeater
                    legend={t.wizard.tiers}
                    rows={d.tiers}
                    addLabel={t.wizard.addTier}
                    removeLabel={t.wizard.removeTier}
                    onAdd={() => update({ tiers: [...d.tiers, { id: uid("tier"), name: "", price: "", capacity: "" }] })}
                    onRemove={(id) => update({ tiers: d.tiers.filter((r) => r.id !== id) })}
                    render={(r, i) => (
                      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                        <Field label={t.wizard.tierName} htmlFor={`tn-${r.id}`} error={err(`tier-${r.id}-name`)}>
                          <Input
                            id={`tn-${r.id}`}
                            value={r.name}
                            onChange={(e) => update({ tiers: d.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                          />
                        </Field>
                        <Field label={t.wizard.tierPrice} htmlFor={`tp-${r.id}`} error={err(`tier-${r.id}-price`)}>
                          <Input
                            id={`tp-${r.id}`}
                            type="number"
                            inputMode="numeric"
                            value={r.price}
                            onChange={(e) => update({ tiers: d.tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })}
                          />
                        </Field>
                        <Field label={t.wizard.tierCapacity} htmlFor={`tc-${r.id}`} error={err(`tier-${r.id}-capacity`)}>
                          <Input
                            id={`tc-${r.id}`}
                            type="number"
                            inputMode="numeric"
                            value={r.capacity}
                            onChange={(e) => update({ tiers: d.tiers.map((x, j) => (j === i ? { ...x, capacity: e.target.value } : x)) })}
                          />
                        </Field>
                      </div>
                    )}
                  />
                ) : null}
                {d.type === "venue" ? (
                  <Repeater
                    legend={t.wizard.tables}
                    rows={d.tables}
                    addLabel={t.wizard.addOption}
                    removeLabel="Remove option"
                    onAdd={() =>
                      update({ tables: [...d.tables, { id: uid("tbl"), name: "", minSpend: "0", deposit: "", seats: "4", kind: "table" }] })
                    }
                    onRemove={(id) => update({ tables: d.tables.filter((r) => r.id !== id) })}
                    render={(r, i) => {
                      const set = (patch: Partial<TableRow>) =>
                        update({ tables: d.tables.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                      return (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                          <Field label={t.wizard.optionName} htmlFor={`on-${r.id}`} error={err(`tbl-${r.id}-name`)}>
                            <Input id={`on-${r.id}`} value={r.name} onChange={(e) => set({ name: e.target.value })} />
                          </Field>
                          <Field label="Kind" htmlFor={`ok-${r.id}`}>
                            <NativeSelect
                              id={`ok-${r.id}`}
                              value={r.kind}
                              onChange={(e) => set({ kind: e.target.value as TableRow["kind"] })}
                            >
                              <option value="entry">Entry</option>
                              <option value="table">Table</option>
                              <option value="vip">VIP</option>
                            </NativeSelect>
                          </Field>
                          <Field label={t.wizard.minSpend} htmlFor={`om-${r.id}`}>
                            <Input
                              id={`om-${r.id}`}
                              type="number"
                              inputMode="numeric"
                              value={r.minSpend}
                              onChange={(e) => set({ minSpend: e.target.value })}
                            />
                          </Field>
                          <Field label={t.wizard.deposit} htmlFor={`od-${r.id}`} error={err(`tbl-${r.id}-deposit`)}>
                            <Input
                              id={`od-${r.id}`}
                              type="number"
                              inputMode="numeric"
                              value={r.deposit}
                              onChange={(e) => set({ deposit: e.target.value })}
                            />
                          </Field>
                          <Field label={t.wizard.seats} htmlFor={`os-${r.id}`} error={err(`tbl-${r.id}-seats`)}>
                            <Input
                              id={`os-${r.id}`}
                              type="number"
                              inputMode="numeric"
                              value={r.seats}
                              onChange={(e) => set({ seats: e.target.value })}
                            />
                          </Field>
                        </div>
                      );
                    }}
                  />
                ) : null}
                {d.type === "service" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t.wizard.pricePerPerson} htmlFor="wz-ppp" error={err("pricePerPerson")}>
                      <Input
                        id="wz-ppp"
                        type="number"
                        inputMode="numeric"
                        value={d.pricePerPerson}
                        onChange={(e) => update({ pricePerPerson: e.target.value })}
                      />
                    </Field>
                    <Field label={t.wizard.durationMins} htmlFor="wz-dur" error={err("durationMins")}>
                      <Input
                        id="wz-dur"
                        type="number"
                        inputMode="numeric"
                        value={d.durationMins}
                        onChange={(e) => update({ durationMins: e.target.value })}
                      />
                    </Field>
                  </div>
                ) : null}
                {d.type === "professional" ? (
                  <Field label={t.wizard.baseRate} htmlFor="wz-rate" error={err("baseRate")}>
                    <Input
                      id="wz-rate"
                      type="number"
                      inputMode="numeric"
                      step={10000}
                      value={d.baseRate}
                      onChange={(e) => update({ baseRate: e.target.value })}
                    />
                  </Field>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="flex flex-col gap-5">
                {d.type === "event" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t.wizard.startsAt} htmlFor="wz-start" error={err("startsAt")}>
                      <Input
                        id="wz-start"
                        type="datetime-local"
                        value={d.startsAt}
                        onChange={(e) => update({ startsAt: e.target.value })}
                      />
                    </Field>
                    <Field label={t.wizard.endsAt} htmlFor="wz-end" error={err("endsAt")}>
                      <Input id="wz-end" type="datetime-local" value={d.endsAt} onChange={(e) => update({ endsAt: e.target.value })} />
                    </Field>
                  </div>
                ) : null}
                {d.type === "venue" ? (
                  <>
                    <Field label={t.wizard.hours} htmlFor="wz-hours" error={err("hours")}>
                      <Input id="wz-hours" value={d.hours} onChange={(e) => update({ hours: e.target.value })} />
                    </Field>
                    <fieldset>
                      <legend className="mb-3 text-sm font-medium">{t.wizard.openDays}</legend>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_SHORT.map((day, i) => {
                          const on = d.openDays.includes(i);
                          return (
                            <button
                              key={day}
                              type="button"
                              aria-pressed={on}
                              onClick={() => update({ openDays: on ? d.openDays.filter((x) => x !== i) : [...d.openDays, i] })}
                              className={cn(
                                "h-11 w-14 rounded-full border text-sm font-medium",
                                on ? "border-accent bg-accent/15" : "border-line-strong text-muted hover:text-ink",
                              )}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      {err("openDays") ? (
                        <p role="alert" className="mt-2 text-sm text-live">
                          {err("openDays")}
                        </p>
                      ) : null}
                    </fieldset>
                  </>
                ) : null}
                {d.type === "service" ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="First day" htmlFor="wz-sstart">
                        <Input id="wz-sstart" type="date" value={d.slotStart} onChange={(e) => update({ slotStart: e.target.value })} />
                      </Field>
                      <Field label="Repeat for" htmlFor="wz-sdays">
                        <NativeSelect id="wz-sdays" value={d.slotDays} onChange={(e) => update({ slotDays: e.target.value })}>
                          <option value="7">7 days</option>
                          <option value="14">14 days</option>
                          <option value="28">28 days</option>
                        </NativeSelect>
                      </Field>
                    </div>
                    {err("slots") ? (
                      <p role="alert" className="text-sm text-live">
                        {err("slots")}
                      </p>
                    ) : null}
                    <Repeater
                      legend={t.wizard.slots}
                      rows={d.slotTimes}
                      addLabel={t.wizard.addSlot}
                      removeLabel="Remove time"
                      onAdd={() => update({ slotTimes: [...d.slotTimes, { id: uid("st"), time: "", capacity: "10" }] })}
                      onRemove={(id) => update({ slotTimes: d.slotTimes.filter((r) => r.id !== id) })}
                      render={(r, i) => (
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={t.wizard.slotStart} htmlFor={`sst-${r.id}`} error={err(`slot-${r.id}-time`)}>
                            <Input
                              id={`sst-${r.id}`}
                              type="time"
                              value={r.time}
                              onChange={(e) =>
                                update({ slotTimes: d.slotTimes.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })
                              }
                            />
                          </Field>
                          <Field label={t.wizard.slotCapacity} htmlFor={`ssc-${r.id}`} error={err(`slot-${r.id}-capacity`)}>
                            <Input
                              id={`ssc-${r.id}`}
                              type="number"
                              inputMode="numeric"
                              value={r.capacity}
                              onChange={(e) =>
                                update({ slotTimes: d.slotTimes.map((x, j) => (j === i ? { ...x, capacity: e.target.value } : x)) })
                              }
                            />
                          </Field>
                        </div>
                      )}
                    />
                  </>
                ) : null}
                {d.type === "professional" ? (
                  <div className="flex max-w-sm flex-col gap-3">
                    <p
                      className={cn("text-sm", err("availability") ? "text-live" : "text-muted")}
                      role={err("availability") ? "alert" : undefined}
                    >
                      {err("availability") ?? `${t.wizard.availabilityHint} ${d.availability.length} selected.`}
                    </p>
                    <AvailabilityCalendar
                      mode="toggle"
                      available={d.availability}
                      onSelect={(k) =>
                        update({
                          availability: d.availability.includes(k) ? d.availability.filter((x) => x !== k) : [...d.availability, k],
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 5 && preview ? (
              <div className="grid gap-8 md:grid-cols-[300px_1fr]">
                <ActivationCard card={preview} />
                <Card className="flex flex-col gap-3 text-sm">
                  <p className="text-muted">{t.types[d.type].one}</p>
                  <p className="font-semibold text-ink">{preview.activation.title}</p>
                  <p className="text-ink/85">{preview.activation.description}</p>
                  <p className="text-muted">{preview.activation.location.area}</p>
                  <p>
                    {t.common.from} {tsh(preview.fromPrice)} <span className="text-muted">{preview.priceUnit}</span>
                  </p>
                  {preview.activation.event ? <p>{formatDateTime(preview.activation.event.startsAt)}</p> : null}
                  {preview.activation.service ? <p>{preview.activation.service.slots.length} slots</p> : null}
                  {preview.activation.professional ? <p>{preview.activation.professional.availability.length} available dates</p> : null}
                  <p className="mt-2 text-xs text-muted">Timbuktu reviews new listings before they go live, usually within a day.</p>
                </Card>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          {step > 0 ? (
            <Button variant="outline" size="lg" onClick={() => go(step - 1)}>
              {t.wizard.back}
            </Button>
          ) : null}
          {step < 5 ? (
            <Button type="submit" size="lg">
              {t.wizard.next}
            </Button>
          ) : (
            <>
              <Button variant="outline" size="lg" disabled={create.isPending} onClick={() => save(false)}>
                {t.wizard.saveDraft}
              </Button>
              <Button size="lg" disabled={create.isPending} onClick={() => save(true)}>
                {create.isPending ? "Saving" : t.wizard.submit}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function Repeater<R extends { id: string }>({
  legend,
  rows,
  render,
  onAdd,
  onRemove,
  addLabel,
  removeLabel,
}: {
  legend: string;
  rows: R[];
  render: (row: R, index: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
  removeLabel: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium">{legend}</legend>
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-start gap-2 rounded-2xl border border-line p-4">
          <div className="min-w-0 flex-1">{render(r, i)}</div>
          <Button variant="ghost" size="icon-sm" aria-label={`${removeLabel} ${i + 1}`} onClick={() => onRemove(r.id)} className="mt-7">
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={onAdd} className="self-start">
        <Plus />
        {addLabel}
      </Button>
    </fieldset>
  );
}
