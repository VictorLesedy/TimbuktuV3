"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { formatPhone, tsh } from "@/lib/format";
import { errorMessage } from "@/lib/queries";
import { PhoneSchema } from "@/lib/schemas";

/** Shared by ambassadors and entertainers. */
export function PayoutDialog({
  balance,
  defaultPhone,
  trigger,
  title,
  amountLabel,
  phoneLabel,
  cta,
  done,
  onSubmit,
}: {
  balance: number;
  defaultPhone: string;
  trigger: string;
  title: string;
  amountLabel: string;
  phoneLabel: string;
  cta: string;
  done: string;
  onSubmit: (input: { amount: number; phone: string }) => Promise<unknown>;
}) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(Math.floor(balance / 1000) * 1000));
  const [phone, setPhone] = React.useState(formatPhone(defaultPhone));
  const [errors, setErrors] = React.useState<{ amount?: string; phone?: string }>({});
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAmount(String(Math.floor(balance / 1000) * 1000));
      setErrors({});
    }
  }, [open, balance]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    const next: typeof errors = {};
    if (!Number.isFinite(n) || n < 5000) next.amount = "Withdraw at least TSh 5,000";
    else if (n > balance) next.amount = `You can withdraw up to ${tsh(balance)}`;
    const p = PhoneSchema.safeParse(phone);
    if (!p.success) next.phone = p.error.issues[0]?.message;
    setErrors(next);
    if (next.amount || next.phone || !p.success) return;
    setPending(true);
    try {
      await onSubmit({ amount: Math.round(n), phone: p.data });
      toast.success(done);
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={balance < 5000}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent title={title} description={`Available: ${tsh(balance)}`}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label={amountLabel} htmlFor="payout-amount" error={errors.amount}>
            <Input
              id="payout-amount"
              type="number"
              inputMode="numeric"
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={Boolean(errors.amount)}
            />
          </Field>
          <Field label={phoneLabel} htmlFor="payout-phone" error={errors.phone}>
            <Input
              id="payout-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhone((v) => formatPhone(v))}
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Requesting" : cta}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
