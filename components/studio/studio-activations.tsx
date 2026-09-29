"use client";

import { Eye, Pause, Pencil, Play, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Chip, Skeleton } from "@/components/ui/misc";
import { LiveDot, Rating } from "@/components/ui/signals";
import { SmartImage } from "@/components/ui/smart-image";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { tsh } from "@/lib/format";
import { errorMessage, useQuickEdit, useSetPaused, useStudioActivations, useSubmitDraft } from "@/lib/queries";
import type { ActivationCard } from "@/lib/repo";
import type { ActivationStatus } from "@/lib/schemas";
import { t } from "@/messages/en";

const STATUS_TONE: Record<ActivationStatus, "default" | "live" | "accent" | "quiet"> = {
  draft: "quiet",
  pending: "accent",
  live: "default",
  paused: "quiet",
  rejected: "live",
  changes_requested: "accent",
};

export function StudioActivations() {
  const q = useStudioActivations();
  const [editing, setEditing] = React.useState<ActivationCard | null>(null);

  return (
    <>
      <PageTitle
        title={t.studio.nav.activations}
        action={
          <Button asChild>
            <Link href="/studio/activations/new">{t.studio.newActivation}</Link>
          </Button>
        }
      />
      {q.isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState
          body={t.studio.activationsEmpty}
          action={
            <Button asChild>
              <Link href="/studio/activations/new">{t.studio.newActivation}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {q.data.map((c) => (
            <li key={c.activation.id}>
              <Row card={c} onEdit={() => setEditing(c)} />
            </li>
          ))}
        </ul>
      )}
      <QuickEditDialog card={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function Row({ card, onEdit }: { card: ActivationCard; onEdit: () => void }) {
  const a = card.activation;
  const pause = useSetPaused();
  const submit = useSubmitDraft();
  const cover = a.media[0];

  async function run(fn: () => Promise<unknown>, done: string) {
    try {
      await fn();
      toast.success(done);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-card bg-surface p-4 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 gap-4">
        {cover ? (
          <SmartImage src={cover.url} alt="" hue={cover.hue} sizes="80px" className="size-20 shrink-0 rounded-2xl" />
        ) : (
          <div className="size-20 shrink-0 rounded-2xl bg-raised" />
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={STATUS_TONE[a.status]}>
              {a.status === "live" && card.signals.busyNow ? <LiveDot /> : null}
              {t.studio.status[a.status]}
            </Chip>
            <span className="text-xs text-muted">{t.types[a.type].one}</span>
          </div>
          <h2 className="truncate font-semibold">{a.title}</h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>
              {t.common.from} {tsh(card.fromPrice)}
            </span>
            {card.signals.rating ? <Rating value={card.signals.rating} count={card.signals.reviewCount} size="sm" /> : null}
            {card.signals.sales48h ? <span>{card.signals.sales48h} bookings in 48h</span> : null}
          </p>
          {a.moderationNote && (a.status === "rejected" || a.status === "changes_requested") ? (
            <p className="text-sm text-ink">
              <span className="text-muted">{t.studio.moderatorNote}: </span>
              {a.moderationNote}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/a/${a.slug}`}>
            <Eye />
            {t.studio.preview}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil />
          {t.studio.edit}
        </Button>
        {a.status === "live" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pause.isPending}
            onClick={() => run(() => pause.mutateAsync({ id: a.id, paused: true }), t.studio.paused)}
          >
            <Pause />
            {t.studio.pause}
          </Button>
        ) : null}
        {a.status === "paused" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pause.isPending}
            onClick={() => run(() => pause.mutateAsync({ id: a.id, paused: false }), t.studio.resumed)}
          >
            <Play />
            {t.studio.resume}
          </Button>
        ) : null}
        {a.status === "draft" || a.status === "changes_requested" ? (
          <Button size="sm" disabled={submit.isPending} onClick={() => run(() => submit.mutateAsync(a.id), t.studio.submitted)}>
            <Send />
            {t.studio.submit}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function QuickEditDialog({ card, onClose }: { card: ActivationCard | null; onClose: () => void }) {
  const edit = useQuickEdit();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    if (card) {
      setTitle(card.activation.title);
      setDescription(card.activation.description);
      setError(undefined);
    }
  }, [card]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    if (title.trim().length < 3) {
      setError("Titles need at least 3 characters");
      return;
    }
    try {
      await edit.mutateAsync({ id: card.activation.id, title, description });
      toast.success(t.studio.changesSaved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Dialog open={Boolean(card)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={t.studio.editTitle}>
        <form onSubmit={save} noValidate className="flex flex-col gap-4">
          <Field label={t.wizard.title_} htmlFor="qe-title" error={error}>
            <Input id="qe-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(error)} />
          </Field>
          <Field label={t.wizard.description} htmlFor="qe-desc">
            <Textarea id="qe-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-40" />
          </Field>
          <Button type="submit" size="lg" disabled={edit.isPending}>
            {edit.isPending ? "Saving" : t.studio.saveChanges}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
