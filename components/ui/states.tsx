"use client";

import { RotateCw } from "lucide-react";
import type * as React from "react";
import { errorMessage } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";
import { Button } from "./button";

export function EmptyState({
  title,
  body,
  action,
  className,
  icon,
}: {
  title?: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-card border border-dashed border-line-strong px-6 py-10 md:items-center md:text-center",
        className,
      )}
    >
      {icon ? <div className="text-muted [&_svg]:size-6">{icon}</div> : null}
      <div className="flex flex-col gap-1.5">
        {title ? <p className="text-lg font-semibold text-ink">{title}</p> : null}
        <p className="measure text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-start gap-4 rounded-card bg-surface px-6 py-8 md:items-center md:text-center", className)}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-lg font-semibold text-ink">{t.states.errorTitle}</p>
        <p className="measure text-muted">{errorMessage(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw />
          {t.common.retry}
        </Button>
      ) : null}
    </div>
  );
}
