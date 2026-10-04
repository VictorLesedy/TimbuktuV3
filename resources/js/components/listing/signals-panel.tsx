import { pct, tsh } from '@/lib/format';
import type { Signals } from '@/lib/signals';
import { cn } from '@/lib/utils';
import { GUEST_GROUPS, type GuestGroup } from '@/types';
import { BoltIcon, CheckBadgeIcon, ClockIcon, HeartIcon, HomeIcon, UserGroupIcon, UserIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Rating } from './listing-card';
import { RhythmHeatmap } from './rhythm-heatmap';
import { SignalBadge } from './signal-badge';

export const GROUP_ICON: Record<GuestGroup, typeof UserIcon> = { Solo: UserIcon, Couples: HeartIcon, Friends: UserGroupIcon, Families: HomeIcon };

export function CrowdMix({ signals, className }: { signals: Signals; className?: string }) {
    return (
        <ul className={cn('space-y-2.5', className)}>
            {GUEST_GROUPS.map((g) => {
                const Icon = GROUP_ICON[g];
                const share = signals.crowd.mix[g];
                return (
                    <li key={g} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
                        <span className="flex items-center gap-2">
                            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                            {g}
                        </span>
                        <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                            <span className="block h-full rounded-full bg-primary" style={{ width: pct(share) }} />
                        </span>
                        <span className="text-right tabular text-muted-foreground">{pct(share)}</span>
                    </li>
                );
            })}
        </ul>
    );
}

function Block({ icon: Icon, title, note, children }: { icon: typeof UserIcon; title: string; note: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
            <div className="space-y-0.5">
                <h3 className="flex items-center gap-2 font-semibold">
                    <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground">{note}</p>
            </div>
            {children}
        </section>
    );
}

/** The listing's live signals, worked out from real bookings, check-ins and saves. */
export function SignalsPanel({ signals }: { signals: Signals }) {
    const { crowd, momentum } = signals;
    return (
        <div className="space-y-5">
            {signals.badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {signals.badges.map((b) => (
                        <SignalBadge key={b.kind} badge={b} />
                    ))}
                </div>
            )}
            <Block icon={CheckBadgeIcon} title="Rating" note="Only from guests who were checked in at the door.">
                <Rating average={signals.rating.average} count={signals.rating.count} className="text-base" />
            </Block>
            <Block icon={ClockIcon} title="Rhythm" note="When this place usually gets busy.">
                <RhythmHeatmap signals={signals} />
            </Block>
            <Block icon={UsersIcon} title="Crowd" note="Who books, and what they spend.">
                {crowd.visible ? (
                    <div className="space-y-4">
                        <CrowdMix signals={signals} />
                        <p className="text-sm">
                            Average spend per booking <span className="font-semibold tabular">{tsh(crowd.averageSpend)}</span>
                            <span className="text-muted-foreground"> from {crowd.bookings} bookings</span>
                        </p>
                    </div>
                ) : (
                    <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                        The crowd mix shows once there are {crowd.needed} bookings, so it is fair. {crowd.bookings} so far.
                    </p>
                )}
            </Block>
            <Block icon={BoltIcon} title="Momentum" note="Bookings and saves in the last 48 hours.">
                <p className="text-sm">
                    <span className="font-display text-2xl tabular">{momentum.bookings}</span> <span className="text-muted-foreground">bookings</span>
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="font-display text-2xl tabular">{momentum.saves}</span> <span className="text-muted-foreground">saves</span>
                </p>
            </Block>
        </div>
    );
}
