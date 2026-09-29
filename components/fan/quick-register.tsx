"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { errorMessage, useQuickRegister } from "@/lib/queries";
import { PhoneSchema } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { t } from "@/messages/en";

type State = { errors: { name?: string; phone?: string }; values: { name: string; phone: string } };

/** The registration gate: two fields, and the fan keeps what they picked. */
export function QuickRegister({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const register = useQuickRegister();
  const setSignedIn = useAppStore((s) => s.setSignedIn);

  const [state, action, pending] = React.useActionState<State, FormData>(
    async (_prev, form) => {
      const name = String(form.get("name") ?? "").trim();
      const phoneRaw = String(form.get("phone") ?? "");
      const values = { name, phone: phoneRaw };
      const errors: State["errors"] = {};
      if (name.length < 2) errors.name = "Enter your name";
      const phone = PhoneSchema.safeParse(phoneRaw);
      if (!phone.success) errors.phone = phone.error.issues[0]?.message;
      if (errors.name || errors.phone) return { errors, values };
      try {
        await register.mutateAsync({ name, phone: phone.data ?? phoneRaw });
        setSignedIn(true);
        toast.success(t.gate.done);
        onDone?.();
        return { errors: {}, values };
      } catch (err) {
        toast.error(errorMessage(err));
        return { errors: {}, values };
      }
    },
    { errors: {}, values: { name: "", phone: "" } },
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {!compact ? (
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">{t.gate.title}</p>
          <p className="text-sm text-muted">{t.gate.body}</p>
        </div>
      ) : null}
      <Field label={t.gate.name} htmlFor="qr-name" error={state.errors.name}>
        <Input
          id="qr-name"
          name="name"
          autoComplete="name"
          defaultValue={state.values.name}
          aria-invalid={Boolean(state.errors.name)}
          aria-describedby={state.errors.name ? "qr-name-error" : undefined}
        />
      </Field>
      <Field label={t.gate.phone} htmlFor="qr-phone" error={state.errors.phone}>
        <Input
          id="qr-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+255 712 345 678"
          defaultValue={state.values.phone}
          aria-invalid={Boolean(state.errors.phone)}
          aria-describedby={state.errors.phone ? "qr-phone-error" : undefined}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account" : t.gate.cta}
      </Button>
      <Link href="/onboarding" className="text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
        {t.gate.fullSignup}
      </Link>
    </form>
  );
}
