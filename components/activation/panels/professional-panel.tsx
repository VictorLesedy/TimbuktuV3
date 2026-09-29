"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { QuickRegister } from "@/components/fan/quick-register";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/misc";
import { formatDate, fromDateKey, tsh } from "@/lib/format";
import { errorMessage, useCreateHire, useMyHireRequests } from "@/lib/queries";
import { type Activation, type HireDetails, HireDetailsSchema } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { t } from "@/messages/en";
import { AvailabilityCalendar } from "../availability-calendar";
import { HireCard } from "../hire-card";
import { GateCard, StepLabel, useSelectionGate } from "./shared";

type ProActivation = Activation & { professional: NonNullable<Activation["professional"]> };
type FormIn = z.input<typeof HireDetailsSchema>;

export function ProfessionalPanel({ activation }: { activation: ProActivation }) {
  const pro = activation.professional;
  const gated = useSelectionGate();
  const signedIn = useAppStore((s) => s.signedIn);
  const create = useCreateHire();
  const requests = useMyHireRequests(activation.id);
  const [gateOpen, setGateOpen] = React.useState(false);

  const form = useForm<FormIn, unknown, HireDetails>({
    resolver: zodResolver(HireDetailsSchema),
    defaultValues: { date: "", location: "", durationHours: 4, budget: pro.baseRate, note: "" },
  });
  const { register, handleSubmit, setValue, watch, reset, formState } = form;
  const date = watch("date");
  const errors = formState.errors;

  const send = handleSubmit(async (details) => {
    try {
      await create.mutateAsync({ id: activation.id, details });
      toast.success(t.professional.sent);
      reset({ date: "", location: "", durationHours: 4, budget: pro.baseRate, note: "" });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  if (gated) return <GateCard />;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">{t.professional.baseRate(pro.baseRate)}</p>

      <div className="flex flex-col gap-3">
        <StepLabel n={1}>{t.professional.calendar}</StepLabel>
        <AvailabilityCalendar
          available={pro.availability}
          selected={date}
          onSelect={(k) => setValue("date", k, { shouldValidate: true })}
        />
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!signedIn) {
            setGateOpen(true);
            return;
          }
          void send(e);
        }}
        className="flex flex-col gap-4"
      >
        <StepLabel n={2}>{t.professional.formTitle}</StepLabel>
        <Field label={t.professional.date} htmlFor="hire-date" error={errors.date?.message}>
          <Input
            id="hire-date"
            readOnly
            value={date ? formatDate(fromDateKey(date).toISOString(), { year: "numeric" }) : ""}
            placeholder={t.professional.datePlaceholder}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? "hire-date-error" : undefined}
          />
        </Field>
        <Field label={t.professional.location} htmlFor="hire-location" error={errors.location?.message}>
          <Input
            id="hire-location"
            placeholder={t.professional.locationPlaceholder}
            aria-invalid={Boolean(errors.location)}
            {...register("location")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.professional.duration} htmlFor="hire-duration" error={errors.durationHours?.message}>
            <Input
              id="hire-duration"
              type="number"
              inputMode="numeric"
              min={1}
              max={12}
              aria-invalid={Boolean(errors.durationHours)}
              {...register("durationHours")}
            />
          </Field>
          <Field label={t.professional.budget} htmlFor="hire-budget" error={errors.budget?.message}>
            <Input
              id="hire-budget"
              type="number"
              inputMode="numeric"
              step={10000}
              aria-invalid={Boolean(errors.budget)}
              {...register("budget")}
            />
          </Field>
        </div>
        <Field label={t.professional.note} htmlFor="hire-note" optional error={errors.note?.message}>
          <Textarea id="hire-note" placeholder={t.professional.notePlaceholder} {...register("note")} />
        </Field>
        <Button type="submit" size="lg" disabled={create.isPending}>
          {create.isPending ? "Sending" : t.professional.cta}
        </Button>
      </form>

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent title={t.gate.title} description={t.gate.body}>
          <QuickRegister
            compact
            onDone={() => {
              setGateOpen(false);
              void send();
            }}
          />
        </DialogContent>
      </Dialog>

      {signedIn ? (
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="text-sm font-medium">{t.professional.requestsTitle}</h3>
          {requests.isPending ? (
            <Skeleton className="h-40" />
          ) : requests.data?.length ? (
            requests.data.map((h) => <HireCard key={h.id} hire={h} />)
          ) : (
            <p className="text-sm text-muted">{`No requests yet. Usually from ${tsh(pro.baseRate)}.`}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
