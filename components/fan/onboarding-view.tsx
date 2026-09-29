"use client";

import { Check, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ThemeMenu } from "@/components/shell/theme-switcher";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { OptionCard, OptionGroup } from "@/components/ui/controls";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Progress } from "@/components/ui/misc";
import { CITIES } from "@/lib/config";
import { formatPhone } from "@/lib/format";
import { errorMessage, useCompleteOnboarding } from "@/lib/queries";
import { listArtists } from "@/lib/repo";
import { type City, type ExperiencePref, type Membership, PhoneSchema } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

type Role = "fan" | "entertainer";
type Category = "venue" | "person" | "service";
type StepId = "role" | "about" | "artists" | "experience" | "membership";

type Draft = {
  role: Role;
  name: string;
  phone: string;
  city: City;
  businessName: string;
  category: Category;
  artists: string[];
  experience: ExperiencePref | "";
  membership: Membership;
};

const STEPS: Record<Role, StepId[]> = {
  fan: ["role", "about", "artists", "experience", "membership"],
  entertainer: ["role", "about", "membership"],
};

export function OnboardingView() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const complete = useCompleteOnboarding();
  const { setSignedIn, setCity } = useAppStore();
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [d, setD] = React.useState<Draft>({
    role: "fan",
    name: "",
    phone: "",
    city: "Dar es Salaam",
    businessName: "",
    category: "venue",
    artists: [],
    experience: "",
    membership: "standard",
  });
  const steps = STEPS[d.role];
  const step = steps[index] ?? "role";
  const heading = React.useRef<HTMLHeadingElement>(null);
  const update = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  // Move focus to the new step's heading so screen readers announce it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on each step change by design
  React.useEffect(() => {
    heading.current?.focus();
  }, [index]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (step === "about") {
      if (d.name.trim().length < 2) e.name = "Enter your full name";
      const p = PhoneSchema.safeParse(d.phone);
      if (!p.success) e.phone = p.error.issues[0]?.message ?? "Enter a valid number";
      if (d.role === "entertainer" && d.businessName.trim().length < 2) e.businessName = "Enter your business or stage name";
    }
    if (step === "artists" && d.artists.length < 3) e.artists = "Pick at least 3 artists";
    if (step === "experience" && !d.experience) e.experience = "Choose one to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next() {
    if (!validate()) return;
    if (index < steps.length - 1) {
      setDirection(1);
      setIndex(index + 1);
      return;
    }
    try {
      await complete.mutateAsync({
        role: d.role,
        name: d.name.trim(),
        phone: PhoneSchema.parse(d.phone),
        city: d.city,
        favouriteArtists: d.artists,
        experiencePref: (d.experience || "days_out") as ExperiencePref,
        membership: d.membership,
        business: d.role === "entertainer" ? { name: d.businessName.trim(), category: d.category } : undefined,
      });
      setSignedIn(true);
      setCity(d.city);
      toast.success(d.role === "entertainer" ? t.onboarding.entertainerDone : t.onboarding.done);
      router.push(d.role === "entertainer" ? "/studio" : "/");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function back() {
    setErrors({});
    setDirection(-1);
    setIndex(Math.max(0, index - 1));
  }

  const titles: Record<StepId, string> = {
    role: t.onboarding.roleTitle,
    about: t.onboarding.aboutTitle,
    artists: t.onboarding.artistsTitle,
    experience: t.onboarding.experienceTitle,
    membership: t.onboarding.membershipTitle,
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-5 pt-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <Wordmark />
        <div className="flex items-center gap-3">
          <ThemeMenu />
          <Link href="/" className="text-sm text-muted hover:text-ink">
            {t.common.close}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {t.onboarding.step(index + 1, steps.length)}
        </p>
        <Progress value={(index + 1) / steps.length} label={t.onboarding.step(index + 1, steps.length)} />
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
        className="flex flex-1 flex-col gap-8"
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={reduce ? false : { opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6"
          >
            <h1 ref={heading} tabIndex={-1} className="font-display text-display-md focus:outline-none">
              {titles[step]}
            </h1>

            {step === "role" ? (
              <OptionGroup value={d.role} onValueChange={(v) => update({ role: v as Role })} aria-label={t.onboarding.roleTitle}>
                {(["fan", "entertainer"] as const).map((r) => (
                  <OptionCard key={r} value={r} className="p-5">
                    <span className="block text-lg font-semibold">{t.onboarding.roles[r].title}</span>
                    <span className="mt-1 block text-sm text-muted">{t.onboarding.roles[r].body}</span>
                  </OptionCard>
                ))}
              </OptionGroup>
            ) : null}

            {step === "about" ? (
              <div className="flex flex-col gap-5">
                <Field label={t.onboarding.name} htmlFor="ob-name" error={errors.name}>
                  <Input
                    id="ob-name"
                    autoComplete="name"
                    value={d.name}
                    onChange={(e) => update({ name: e.target.value })}
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>
                <Field label={t.onboarding.phone} htmlFor="ob-phone" error={errors.phone}>
                  <Input
                    id="ob-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+255 712 345 678"
                    value={d.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    onBlur={() => update({ phone: formatPhone(d.phone) })}
                    aria-invalid={Boolean(errors.phone)}
                  />
                </Field>
                <Field label={t.onboarding.city} htmlFor="ob-city">
                  <NativeSelect id="ob-city" value={d.city} onChange={(e) => update({ city: e.target.value as City })}>
                    {CITIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Field>
                {d.role === "entertainer" ? (
                  <>
                    <Field label={t.onboarding.businessName} htmlFor="ob-biz" error={errors.businessName}>
                      <Input
                        id="ob-biz"
                        value={d.businessName}
                        onChange={(e) => update({ businessName: e.target.value })}
                        aria-invalid={Boolean(errors.businessName)}
                      />
                    </Field>
                    <fieldset className="flex flex-col gap-3">
                      <legend className="mb-3 text-sm font-medium">{t.onboarding.businessCategory}</legend>
                      <OptionGroup
                        value={d.category}
                        onValueChange={(v) => update({ category: v as Category })}
                        aria-label={t.onboarding.businessCategory}
                      >
                        {(["venue", "person", "service"] as const).map((c) => (
                          <OptionCard key={c} value={c} className="py-3">
                            <span className="text-sm font-medium">{t.onboarding.categories[c]}</span>
                          </OptionCard>
                        ))}
                      </OptionGroup>
                    </fieldset>
                  </>
                ) : null}
              </div>
            ) : null}

            {step === "artists" ? (
              <div className="flex flex-col gap-4">
                <p
                  className={cn("text-sm", errors.artists ? "text-live" : "text-muted")}
                  role={errors.artists ? "alert" : undefined}
                  aria-live="polite"
                >
                  {errors.artists ?? t.onboarding.artistsHint(d.artists.length)}
                </p>
                <ul className="flex flex-wrap gap-2">
                  {listArtists().map((a) => {
                    const on = d.artists.includes(a);
                    return (
                      <li key={a}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => update({ artists: on ? d.artists.filter((x) => x !== a) : [...d.artists, a] })}
                          className={cn(
                            "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                            on
                              ? "border-accent bg-accent/[0.12] text-ink"
                              : "border-line-strong text-muted hover:border-muted hover:text-ink",
                          )}
                        >
                          {on ? <Check className="size-4 text-accent" aria-hidden="true" /> : null}
                          {a}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {step === "experience" ? (
              <div className="flex flex-col gap-3">
                <OptionGroup
                  value={d.experience}
                  onValueChange={(v) => update({ experience: v as ExperiencePref })}
                  aria-label={t.onboarding.experienceTitle}
                >
                  {(["music_nightlife", "sport", "days_out", "arts_culture"] as const).map((x) => (
                    <OptionCard key={x} value={x} className="p-5">
                      <span className="block font-semibold">{t.onboarding.experiences[x].title}</span>
                      <span className="mt-1 block text-sm text-muted">{t.onboarding.experiences[x].body}</span>
                    </OptionCard>
                  ))}
                </OptionGroup>
                {errors.experience ? (
                  <p role="alert" className="text-sm text-live">
                    {errors.experience}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === "membership" ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">{t.onboarding.membershipHint}</p>
                <OptionGroup
                  value={d.membership}
                  onValueChange={(v) => update({ membership: v as Membership })}
                  aria-label={t.onboarding.membershipTitle}
                >
                  {(["standard", "gold", "platinum"] as const).map((m) => (
                    <OptionCard key={m} value={m} className="p-5">
                      <span className="block font-semibold">{t.onboarding.memberships[m].title}</span>
                      <span className="mt-1 block text-sm text-muted">{t.onboarding.memberships[m].body}</span>
                    </OptionCard>
                  ))}
                </OptionGroup>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-auto flex gap-3">
          {index > 0 ? (
            <Button variant="outline" size="lg" onClick={back}>
              <ChevronLeft />
              {t.common.back}
            </Button>
          ) : null}
          <Button type="submit" size="lg" className="flex-1" disabled={complete.isPending}>
            {index === steps.length - 1 ? (complete.isPending ? "Creating account" : t.onboarding.finish) : t.common.continue}
          </Button>
        </div>
      </form>
    </div>
  );
}
