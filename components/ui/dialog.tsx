"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/**
 * One component for dialogs and sheets. On mobile it rises from the bottom as a
 * sheet; from md up it becomes a centred dialog, or a side drawer with side="left".
 */
export function DialogContent({
  title,
  description,
  children,
  className,
  side = "auto",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  side?: "auto" | "left";
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface text-ink shadow-[0_-12px_48px_var(--color-shadow)] focus:outline-none",
          side === "auto" &&
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet data-[state=closed]:animate-sheet-down data-[state=open]:animate-sheet-up md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[88dvh] md:w-[min(560px,calc(100vw-3rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sheet md:data-[state=closed]:animate-fade-out md:data-[state=open]:animate-fade-in",
          side === "left" &&
            "inset-y-0 left-0 w-[min(320px,86vw)] data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in",
          className,
        )}
      >
        {side === "auto" ? <div aria-hidden="true" className="mx-auto mt-3 h-1 w-10 rounded-full bg-tint/15 md:hidden" /> : null}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 md:pt-6">
          <div className="flex flex-col gap-1">
            <D.Title className="text-xl font-semibold tracking-tight">{title}</D.Title>
            {description ? <D.Description className="text-sm text-muted">{description}</D.Description> : null}
          </div>
          <D.Close
            aria-label={t.common.close}
            className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-tint/5 hover:text-ink"
          >
            <X className="size-5" />
          </D.Close>
        </div>
        {!description ? <D.Description className="sr-only">{title}</D.Description> : null}
        <div className="overflow-y-auto px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
