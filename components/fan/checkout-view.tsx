"use client";

import { Check, ChevronLeft, Lock, Smartphone, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OptionCard, OptionGroup, Segmented } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { Card, Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/states";
import { CHECKOUT_TIMEOUT_SECONDS, MOBILE_NETWORKS } from "@/lib/config";
import { formatPhone, tsh } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { errorMessage, useConfirmPayment, useCreateOrder, useExpireOrder, useMe, useValidatePromo } from "@/lib/queries";
import { type Order, PhoneSchema } from "@/lib/schemas";
import { type CartItem, useAppStore } from "@/lib/store";
import { t } from "@/messages/en";
import { QuickRegister } from "./quick-register";

type Outcome = "success" | "failure" | "timeout";
type Phase =
  | { name: "form" }
  | { name: "pending"; order: Order; outcome: Outcome }
  | { name: "success"; order: Order }
  | { name: "failed"; message: string }
  | { name: "expired" };

export function CheckoutView() {
  const hydrated = useHydrated();
  const cart = useAppStore((s) => s.cart);
  const [phase, setPhase] = React.useState<Phase>({ name: "form" });
  const [snapshot, setSnapshot] = React.useState<CartItem | null>(null);
  const item = cart ?? snapshot;

  if (!hydrated) {
    return (
      <Shell>
        <Skeleton className="h-96" />
      </Shell>
    );
  }

  if (!item) {
    return (
      <Shell>
        <EmptyState
          body={t.checkout.empty}
          action={
            <Button asChild>
              <Link href="/explore">{t.checkout.browse}</Link>
            </Button>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell back={phase.name === "form" ? `/a/${item.slug}` : undefined}>
      <AnimatePresence mode="wait" initial={false}>
        {phase.name === "form" ? (
          <Step key="form">
            <PayForm item={item} onPending={(order, outcome) => setPhase({ name: "pending", order, outcome })} />
          </Step>
        ) : phase.name === "pending" ? (
          <Step key="pending">
            <Pending
              order={phase.order}
              outcome={phase.outcome}
              onDone={(next) => {
                if (next.name === "success") {
                  setSnapshot(item);
                  useAppStore.getState().clearCart();
                }
                setPhase(next);
              }}
            />
          </Step>
        ) : phase.name === "success" ? (
          <Step key="success">
            <Success order={phase.order} item={item} />
          </Step>
        ) : (
          <Step key="failed">
            <Failed
              title={phase.name === "expired" ? t.checkout.expiredTitle : t.checkout.failedTitle}
              body={phase.name === "expired" ? t.checkout.expiredBody : phase.message}
              onRetry={() => setPhase({ name: "form" })}
            />
          </Step>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Shell({ children, back }: { children: React.ReactNode; back?: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pt-6 pb-16 md:pt-10">
      <div className="flex items-center gap-3">
        {back ? (
          <Link href={back} aria-label={t.common.back} className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-tint/5">
            <ChevronLeft className="size-5" />
          </Link>
        ) : null}
        <h1 className="font-display text-display-md">{t.checkout.title}</h1>
      </div>
      {children}
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Summary({ item, discount }: { item: CartItem; discount: number }) {
  const subtotal = item.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm text-muted">{t.checkout.summary}</h2>
        <p className="text-lg font-semibold">{item.title}</p>
        {item.when ? <p className="text-sm text-muted">{item.when}</p> : null}
      </div>
      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
        {item.lines.map((l) => (
          <div key={l.label} className="flex justify-between gap-3">
            <dt className="text-ink">
              {l.label}
              {l.qty > 1 ? <span className="text-muted"> × {l.qty}</span> : null}
            </dt>
            <dd className="tabular">{tsh(l.unitPrice * l.qty)}</dd>
          </div>
        ))}
        {discount ? (
          <div className="flex justify-between gap-3 text-accent">
            <dt>{t.checkout.discount}</dt>
            <dd className="tabular">−{tsh(discount)}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <dt className="font-medium">{t.common.total}</dt>
          <dd className="font-display text-3xl tabular">{tsh(subtotal - discount)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function PayForm({ item, onPending }: { item: CartItem; onPending: (order: Order, outcome: Outcome) => void }) {
  const signedIn = useAppStore((s) => s.signedIn);
  const me = useMe();
  const promo = useValidatePromo();
  const create = useCreateOrder();
  const [promoInput, setPromoInput] = React.useState("");
  const [applied, setApplied] = React.useState<{ code: string; rate: number } | null>(null);
  const [promoError, setPromoError] = React.useState<string>();
  const [network, setNetwork] = React.useState<string>(MOBILE_NETWORKS[0]);
  const [phone, setPhone] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string>();
  const [outcome, setOutcome] = React.useState<Outcome>("success");

  React.useEffect(() => {
    if (me.data?.user && !phone) setPhone(formatPhone(me.data.user.phone));
  }, [me.data, phone]);

  const subtotal = item.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = applied ? Math.round((subtotal * applied.rate) / 100) * 100 : 0;
  const total = subtotal - discount;

  async function applyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoInput.trim()) return;
    setPromoError(undefined);
    try {
      const res = await promo.mutateAsync(promoInput);
      setApplied(res);
      toast.success(t.checkout.promoApplied(res.code, Math.round(res.rate * 100)));
    } catch (err) {
      setPromoError(errorMessage(err));
    }
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    const parsed = PhoneSchema.safeParse(phone);
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message);
      document.getElementById("pay-phone")?.focus();
      return;
    }
    setPhoneError(undefined);
    try {
      const order = await create.mutateAsync({
        activationId: item.activationId,
        kind: item.kind,
        lines: item.lines,
        scheduledFor: item.scheduledFor,
        hireRequestId: item.hireRequestId,
        promoCode: applied?.code,
        phone: parsed.data,
        network,
      });
      onPending(order, outcome);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Summary item={item} discount={discount} />

      <form onSubmit={applyPromo} noValidate className="flex flex-col gap-2">
        {applied ? (
          <div className="flex items-center justify-between gap-3 rounded-field border border-accent/40 bg-accent/[0.06] px-4 py-3 text-sm">
            <span>{t.checkout.promoApplied(applied.code, Math.round(applied.rate * 100))}</span>
            <Button variant="link" size="sm" onClick={() => setApplied(null)}>
              {t.checkout.removePromo}
            </Button>
          </div>
        ) : (
          <Field label={t.checkout.promo} htmlFor="promo" optional error={promoError}>
            <div className="flex gap-2">
              <Input
                id="promo"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder={t.checkout.promoPlaceholder}
                autoCapitalize="characters"
                aria-invalid={Boolean(promoError)}
                aria-describedby={promoError ? "promo-error" : undefined}
              />
              <Button type="submit" variant="secondary" className="h-12 shrink-0" disabled={promo.isPending || !promoInput.trim()}>
                {t.checkout.applyPromo}
              </Button>
            </div>
          </Field>
        )}
      </form>

      {!signedIn ? (
        <Card>
          <QuickRegister />
        </Card>
      ) : (
        <form onSubmit={pay} noValidate className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 font-semibold">{t.checkout.pay}</legend>
            <OptionGroup value={network} onValueChange={setNetwork} aria-label={t.checkout.network} className="grid grid-cols-2 gap-2">
              {MOBILE_NETWORKS.map((n) => (
                <OptionCard key={n} value={n} className="py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="size-4 text-muted" aria-hidden="true" />
                    {n}
                  </span>
                </OptionCard>
              ))}
            </OptionGroup>
          </fieldset>
          <Field label={t.checkout.phone} htmlFor="pay-phone" hint={t.checkout.phoneHint} error={phoneError}>
            <Input
              id="pay-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhone((p) => formatPhone(p))}
              aria-invalid={Boolean(phoneError)}
              aria-describedby={phoneError ? "pay-phone-error" : "pay-phone-hint"}
            />
          </Field>
          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong p-4">
            <span className="text-sm text-muted">{t.checkout.outcome}</span>
            <Segmented<Outcome>
              size="sm"
              label={t.checkout.outcome}
              value={outcome}
              onChange={setOutcome}
              options={(["success", "failure", "timeout"] as const).map((o) => ({ value: o, label: t.checkout.outcomes[o] }))}
            />
          </div>
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending ? "Starting payment" : t.checkout.payCta(tsh(total))}
          </Button>
          <p className="flex items-center justify-center gap-2 text-center text-xs text-muted">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            {t.checkout.secured}
          </p>
        </form>
      )}
    </div>
  );
}

function Pending({ order, outcome, onDone }: { order: Order; outcome: Outcome; onDone: (p: Phase) => void }) {
  const { mutateAsync: confirmAsync } = useConfirmPayment();
  const { mutateAsync: expireAsync } = useExpireOrder();
  const [left, setLeft] = React.useState(CHECKOUT_TIMEOUT_SECONDS);
  const reduce = useReducedMotion();

  // Latest callbacks in a ref, so the timers below start exactly once.
  const latest = React.useRef({ confirmAsync, expireAsync, onDone, order });
  latest.current = { confirmAsync, expireAsync, onDone, order };
  const settled = React.useRef(false);

  const finish = React.useCallback(async (kind: "success" | "failure" | "expire") => {
    if (settled.current) return;
    settled.current = true;
    const { confirmAsync: confirm, expireAsync: expire, onDone: done, order: o } = latest.current;
    try {
      if (kind === "expire") {
        await expire(o.id);
        done({ name: "expired" });
        return;
      }
      const result = await confirm({ id: o.id, outcome: kind });
      if (kind === "success") done({ name: "success", order: { ...o, ...result, status: "paid" } });
      else done({ name: "failed", message: t.checkout.failedBody });
    } catch (err) {
      done({ name: "failed", message: errorMessage(err) });
    }
  }, []);

  React.useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = Math.max(0, CHECKOUT_TIMEOUT_SECONDS - Math.floor((Date.now() - started) / 1000));
      setLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        void finish("expire");
      }
    }, 250);
    // Simulated network callback. "No response" never calls back.
    const callback = outcome === "timeout" ? null : setTimeout(() => void finish(outcome), 3500 + Math.random() * 1500);
    return () => {
      clearInterval(id);
      if (callback) clearTimeout(callback);
    };
  }, [finish, outcome]);

  const progress = left / CHECKOUT_TIMEOUT_SECONDS;
  const r = 52;
  const c = 2 * Math.PI * r;

  return (
    <Card className="flex flex-col items-center gap-6 py-10 text-center" role="status" aria-live="polite">
      <div className="relative grid size-32 place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={r} fill="none" className="stroke-line" strokeWidth="4" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            className="stroke-accent"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            style={{ transition: reduce ? undefined : "stroke-dashoffset 250ms linear" }}
          />
        </svg>
        <Smartphone className="size-9 text-ink" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t.checkout.confirmTitle}</h2>
        <p className="measure text-muted">{t.checkout.confirmBody(order.network ?? "mobile money", formatPhone(order.phone ?? ""))}</p>
        <p className="font-display text-3xl tabular">{tsh(order.total)}</p>
        <p className="text-sm text-muted tabular">{t.checkout.timeLeft(left)}</p>
      </div>
      <Button variant="ghost" onClick={() => void finish("expire")}>
        {t.checkout.cancelPayment}
      </Button>
    </Card>
  );
}

function Success({ order, item }: { order: Order; item: CartItem }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const title = t.checkout.successTitle[order.kind];
  return (
    <Card className="flex flex-col items-center gap-6 py-10 text-center">
      <motion.div
        initial={reduce ? false : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        className="grid size-16 place-items-center rounded-full bg-accent text-on-accent"
      >
        <Check className="size-8" strokeWidth={3} aria-hidden="true" />
      </motion.div>
      <div className="flex flex-col gap-2" role="status">
        <h2 className="font-display text-display-md">{title}</h2>
        <p className="text-muted">
          {item.title}
          {item.when ? `, ${item.when}` : ""}
        </p>
      </div>
      {order.kind !== "hire" ? (
        <>
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG value={order.code} size={168} bgColor="#FFFFFF" fgColor="#0B1322" title={t.me.qrLabel(order.code)} />
          </div>
          <p className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t.me.code}</span>
            <span className="font-mono text-lg tracking-wider">{order.code}</span>
          </p>
          <p className="text-sm text-muted">{t.checkout.successBody}</p>
        </>
      ) : null}
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          size="lg"
          onClick={() =>
            router.push(order.kind === "ticket" ? "/me?tab=tickets" : order.kind === "hire" ? "/me?tab=hire" : "/me?tab=bookings")
          }
        >
          {t.checkout.viewTickets}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/explore">{t.checkout.browse}</Link>
        </Button>
      </div>
    </Card>
  );
}

function Failed({ title, body, onRetry }: { title: string; body: string; onRetry: () => void }) {
  return (
    <Card role="alert" className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="grid size-16 place-items-center rounded-full border border-live/60 text-live">
        <X className="size-8" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="measure text-muted">{body}</p>
      </div>
      <Button size="lg" onClick={onRetry}>
        {t.checkout.tryAgain}
      </Button>
    </Card>
  );
}
