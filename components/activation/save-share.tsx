"use client";

import { Link2, MessageCircle, Send, Share2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { HeartIcon } from "@/components/ui/signals";
import { errorMessage, useShare, useToggleSave } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { t } from "@/messages/en";

/** Save with an optimistic heart: the UI flips first, the server confirms after. */
export function SaveButton({ activationId, saved }: { activationId: string; saved: boolean }) {
  const [optimisticSaved, setOptimisticSaved] = React.useOptimistic(saved);
  const [, startTransition] = React.useTransition();
  const toggle = useToggleSave();
  const signedIn = useAppStore((s) => s.signedIn);

  function onClick() {
    if (!signedIn) {
      toast(t.detail.saveGate, { action: { label: t.nav.signUp, onClick: () => window.location.assign("/onboarding") } });
      return;
    }
    const next = !optimisticSaved;
    startTransition(async () => {
      setOptimisticSaved(next);
      try {
        await toggle.mutateAsync({ id: activationId, save: next });
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-pressed={optimisticSaved}
      aria-label={optimisticSaved ? t.common.unsave : t.common.save}
      onClick={onClick}
    >
      <HeartIcon filled={optimisticSaved} />
    </Button>
  );
}

const CHANNELS = [
  { id: "WhatsApp", icon: MessageCircle },
  { id: "Instagram", icon: Send },
  { id: "X", icon: Share2 },
] as const;

export function ShareSheet({ activationId, slug, title }: { activationId: string; slug: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  const share = useShare();
  const referral = useAppStore((s) => s.referralCode);
  const url = typeof window === "undefined" ? `/a/${slug}` : `${window.location.origin}/a/${slug}${referral ? "" : ""}`;

  async function send(channel: string) {
    try {
      await share.mutateAsync({ id: activationId, channel });
      if (channel === "link") {
        await navigator.clipboard?.writeText(url).catch(() => undefined);
        toast.success(t.detail.linkCopied);
      } else {
        toast.success(t.detail.shareDone(channel));
      }
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" aria-label={`${t.common.share} ${title}`}>
          <Share2 className="!size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent title={t.detail.shareTitle} description={t.detail.shareBody}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            {CHANNELS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                disabled={share.isPending}
                onClick={() => send(id)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-canvas/50 px-3 py-4 text-sm text-ink transition-colors hover:bg-raised disabled:opacity-50"
              >
                <Icon className="size-5 text-accent" aria-hidden="true" />
                {id}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => send("link")} disabled={share.isPending}>
            <Link2 />
            {t.detail.copyLink}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
