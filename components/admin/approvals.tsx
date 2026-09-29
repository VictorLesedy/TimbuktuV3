"use client";

import { Check, MessageSquareWarning, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { ActivationCard } from "@/components/activation/activation-card";
import { PageTitle } from "@/components/shell/console-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { Card, Chip, Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { relativeTime } from "@/lib/format";
import { errorMessage, useApprovals, useDecide } from "@/lib/queries";
import type { ApprovalItem, Decision } from "@/lib/repo";
import { t } from "@/messages/en";

type Pending = { item: ApprovalItem; decision: Exclude<Decision, "approve"> };

export function Approvals() {
  const q = useApprovals();
  const decide = useDecide();
  const [pending, setPending] = React.useState<Pending | null>(null);

  async function approve(item: ApprovalItem) {
    try {
      await decide.mutateAsync({ kind: item.kind, id: item.id, decision: "approve" });
      toast.success(`${t.admin.approved}: ${item.title}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageTitle title={t.admin.nav.approvals} />
      {q.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data.length ? (
        <EmptyState icon={<Check />} body={t.admin.approvalsEmpty} />
      ) : (
        <ul className="flex flex-col gap-4">
          {q.data.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Card className="flex flex-col gap-5 md:flex-row">
                {item.kind === "activation" ? (
                  <div className="w-full shrink-0 md:w-64">
                    <ActivationCard card={item.card} />
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone="accent">{item.kind === "activation" ? t.admin.newListing : t.admin.newProfile}</Chip>
                      <span className="text-xs text-muted">{relativeTime(item.submittedAt)}</span>
                    </div>
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm text-muted">{item.subtitle}</p>
                    {item.kind === "provider" ? <p className="text-sm text-muted">{t.admin.submittedBy(item.owner)}</p> : null}
                  </div>
                  {item.kind === "activation" ? (
                    <>
                      <p className="measure line-clamp-4 text-sm text-ink/85">{item.card.activation.description}</p>
                      <Link href={`/a/${item.card.activation.slug}`} className="text-sm text-accent hover:underline">
                        {t.common.viewListing}
                      </Link>
                    </>
                  ) : null}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button disabled={decide.isPending} onClick={() => approve(item)}>
                      <Check />
                      {t.admin.approve}
                    </Button>
                    <Button variant="outline" disabled={decide.isPending} onClick={() => setPending({ item, decision: "request_changes" })}>
                      <MessageSquareWarning />
                      {t.admin.requestChanges}
                    </Button>
                    <Button variant="danger" disabled={decide.isPending} onClick={() => setPending({ item, decision: "reject" })}>
                      <X />
                      {t.admin.reject}
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <NoteDialog pending={pending} onClose={() => setPending(null)} />
    </>
  );
}

function NoteDialog({ pending, onClose }: { pending: Pending | null; onClose: () => void }) {
  const decide = useDecide();
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string>();
  // biome-ignore lint/correctness/useExhaustiveDependencies: clear the note whenever a different item opens
  React.useEffect(() => {
    setNote("");
    setError(undefined);
  }, [pending]);
  const isReject = pending?.decision === "reject";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    if (note.trim().length < 5) {
      setError("Tell the entertainer what to change, in at least 5 characters");
      return;
    }
    try {
      await decide.mutateAsync({ kind: pending.item.kind, id: pending.item.id, decision: pending.decision, note: note.trim() });
      toast.success(isReject ? t.admin.rejected : t.admin.changesRequested);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Dialog open={Boolean(pending)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={isReject ? t.admin.reject : t.admin.requestChanges} description={pending?.item.title}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label={t.admin.note} htmlFor="mod-note" error={error}>
            <Textarea
              id="mod-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.admin.notePlaceholder}
              aria-invalid={Boolean(error)}
            />
          </Field>
          <Button type="submit" size="lg" variant={isReject ? "danger" : "primary"} disabled={decide.isPending}>
            {isReject ? t.admin.reject : t.admin.requestChanges}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
