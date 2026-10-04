import { Photo } from '@/components/listing/photo';
import { formatDateTime, tsh } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Listing, Order } from '@/types';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { QRCodeSVG } from 'qrcode.react';

export const ticketCode = (o: Pick<Order, 'code'>) => `TBK-${o.code}`;

/** A ticket as it appears at the door: what, when, who, and the QR code staff scan. */
export function Ticket({ order, listing, compact, className }: { order: Order; listing: Listing; compact?: boolean; className?: string }) {
    const used = Boolean(order.checkedInAt);
    return (
        <article
            className={cn('ticket-notch overflow-hidden rounded-2xl bg-card text-card-foreground shadow-card ring-1 ring-foreground/10', className)}
            style={{ ['--notch-y' as string]: compact ? '50%' : '62%' }}
            aria-label={`Ticket for ${listing.title}`}
        >
            <div className={cn('flex gap-4 p-4', compact ? 'items-center' : 'flex-col')}>
                {!compact && <Photo photo={listing.photos[0]!} width={480} ratio={16 / 7} className="-mx-4 -mt-4 rounded-none" sizes="400px" />}
                <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="truncate font-semibold">{listing.title}</h3>
                    <p className="text-sm text-muted-foreground">{formatDateTime(order.visitAt)}</p>
                    <p className="text-sm text-muted-foreground">
                        {order.lines.map((l) => `${l.qty} × ${l.label}`).join(', ')}
                        {order.dueOnDay > 0 && ` · ${tsh(order.dueOnDay)} due on the day`}
                    </p>
                </div>
                {compact && (
                    <div className="shrink-0 rounded-lg bg-white p-1.5">
                        <QRCodeSVG value={ticketCode(order)} size={64} level="M" />
                    </div>
                )}
            </div>
            {!compact && (
                <>
                    <div className="mx-4 border-t border-dashed" />
                    <div className="flex items-center gap-4 p-4">
                        <div className={cn('rounded-xl bg-white p-2', used && 'opacity-40')}>
                            <QRCodeSVG value={ticketCode(order)} size={112} level="M" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Ticket code</p>
                            <p className="font-display text-xl tabular">{ticketCode(order)}</p>
                            {used ? (
                                <p className="flex items-center gap-1 text-sm text-live">
                                    <CheckCircleIcon className="size-4" aria-hidden="true" />
                                    Used at the door
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Show this at the door. It works once.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </article>
    );
}
