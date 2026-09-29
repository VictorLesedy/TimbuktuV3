"use client";

import { CheckCircle2, QrCode, Wallet } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Chip } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDate, formatTime, tsh } from "@/lib/format";
import type { MyOrder } from "@/lib/repo";
import { t } from "@/messages/en";

export function TicketCard({ order }: { order: MyOrder }) {
  const cover = order.activation.media[0];
  const when = order.scheduledFor ?? order.createdAt;
  const past = new Date(when).getTime() < Date.now() - 6 * 3_600_000;
  const qty = order.lines.reduce((s, l) => s + l.qty, 0);

  return (
    <article className="flex flex-col overflow-hidden rounded-card bg-surface sm:flex-row">
      {cover ? (
        <SmartImage
          src={cover.url}
          alt=""
          hue={cover.hue}
          sizes="(min-width: 640px) 180px, 100vw"
          className="h-32 w-full shrink-0 sm:h-auto sm:w-44"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Link href={`/a/${order.activation.slug}`} className="font-semibold hover:underline">
              {order.activation.title}
            </Link>
            <p className="text-sm text-muted">
              {formatDate(when)}, {formatTime(when)}. {order.activation.area}, {order.activation.city}
            </p>
          </div>
          {order.checkedInAt ? (
            <Chip tone="quiet">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {t.me.checkedIn}
            </Chip>
          ) : past ? (
            <Chip tone="quiet">{t.me.past}</Chip>
          ) : (
            <Chip tone="accent">{t.me.upcoming}</Chip>
          )}
        </div>
        <p className="text-sm text-ink">
          {order.lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ""}${l.label}`).join(", ")}
          <span className="text-muted"> for {tsh(order.total)}</span>
        </p>
        {order.kind !== "hire" ? (
          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant={past ? "outline" : "primary"}>
                  <QrCode />
                  {t.me.showCode}
                </Button>
              </DialogTrigger>
              <DialogContent
                title={order.activation.title}
                description={`${formatDate(when)}, ${formatTime(when)}${qty > 1 ? `. Admits ${qty}` : ""}`}
              >
                <div className="flex flex-col items-center gap-4 pb-2">
                  <div className="rounded-2xl bg-white p-5">
                    <QRCodeSVG value={order.code} size={220} bgColor="#FFFFFF" fgColor="#0B1322" title={t.me.qrLabel(order.code)} />
                  </div>
                  <p className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted">{t.me.code}</span>
                    <span className="font-mono text-xl tracking-wider">{order.code}</span>
                  </p>
                  {order.checkedInAt ? <p className="text-sm text-muted">{t.me.checkedIn}</p> : null}
                </div>
              </DialogContent>
            </Dialog>
            {!past ? (
              <Button size="sm" variant="ghost" onClick={() => toast.success(t.me.addedToWallet)}>
                <Wallet />
                {t.me.addToWallet}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
