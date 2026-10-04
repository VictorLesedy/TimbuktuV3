import { TimeArea } from '@/components/charts';
import { EmptyState, StatCard } from '@/components/empty-state';
import { CrowdMix } from '@/components/listing/signals-panel';
import { RhythmHeatmap } from '@/components/listing/rhythm-heatmap';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/layouts/console-layout';
import { DAY, formatDateTime, formatDayMonth, pct, startOfDay, timeAgo, tsh } from '@/lib/format';
import { useSignals } from '@/lib/signals';
import { useHostData } from '@/lib/studio';
import { useApp } from '@/store/app-store';
import { BookmarkIcon, CalendarDaysIcon, ChatBubbleLeftRightIcon, PlusIcon, TicketIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/20/solid';
import { Head, Link } from '@inertiajs/react';
import { useMemo, useState, type ReactNode } from 'react';

function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`space-y-4 rounded-2xl border bg-card p-5 ${className ?? ''}`}>
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

export default function StudioOverview() {
    const { listings, byId, orders } = useHostData();
    const reviews = useApp((s) => s.reviews);
    const saves = useApp((s) => s.saves);
    const hireRequests = useApp((s) => s.hireRequests);
    const fans = useApp((s) => s.fans);
    const signals = useSignals();
    const live = listings.filter((l) => l.status === 'live' && l.kind !== 'professional');
    const [audienceId, setAudienceId] = useState(live[0]?.id ?? '');

    const data = useMemo(() => {
        const now = Date.now();
        const today = startOfDay(now).getTime();
        const sum = (from: number) => {
            const list = orders.filter((o) => new Date(o.createdAt).getTime() >= from);
            return { amount: list.reduce((s, o) => s + o.total, 0), count: list.length };
        };
        const ids = new Set(listings.map((l) => l.id));
        const days = Array.from({ length: 14 }, (_, i) => {
            const from = today - (13 - i) * DAY;
            const to = from + DAY;
            const inDay = (iso: string) => {
                const t = new Date(iso).getTime();
                return t >= from && t < to;
            };
            return {
                day: formatDayMonth(from),
                bookings: orders.filter((o) => inDay(o.createdAt)).length,
                saves: saves.filter((s) => ids.has(s.listingId) && inDay(s.at)).length,
            };
        });
        const upcoming = orders.filter((o) => new Date(o.visitAt).getTime() > now && !o.hireRequestId).sort((a, b) => a.visitAt.localeCompare(b.visitAt)).slice(0, 6);
        const latestReviews = reviews.filter((r) => ids.has(r.listingId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
        const waiting = hireRequests.filter((r) => ids.has(r.listingId) && r.status === 'requested');
        return {
            today: sum(today),
            week: sum(today - ((new Date().getDay() + 6) % 7) * DAY),
            month: sum(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()),
            days,
            upcoming,
            latestReviews,
            waiting,
        };
    }, [orders, listings, reviews, saves, hireRequests]);

    const name = (fanId: string) => fans.find((f) => f.id === fanId)?.name ?? 'Guest';
    const audience = signals.get(audienceId);

    return (
        <>
            <Head title="Studio" />
            <PageHeader
                title="Overview"
                description="How your listings are selling and who is coming."
                actions={
                    <Button asChild>
                        <Link href="/studio/listings/new">
                            <PlusIcon />
                            New listing
                        </Link>
                    </Button>
                }
            />
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard icon={TicketIcon} label="Sales today" value={tsh(data.today.amount)} sub={`${data.today.count} orders`} />
                    <StatCard icon={CalendarDaysIcon} label="This week" value={tsh(data.week.amount)} sub={`${data.week.count} orders`} />
                    <StatCard icon={CalendarDaysIcon} label="This month" value={tsh(data.month.amount)} sub={`${data.month.count} orders`} />
                </div>

                <Panel title="Momentum, last 14 days">
                    <TimeArea
                        data={data.days}
                        xKey="day"
                        config={{ bookings: { label: 'Bookings', color: 'var(--chart-1)', icon: TicketIcon }, saves: { label: 'Saves', color: 'var(--chart-2)', icon: BookmarkIcon } }}
                    />
                </Panel>

                {audience && (
                    <Panel
                        title="Audience"
                        action={
                            <Select value={audienceId} onValueChange={setAudienceId}>
                                <SelectTrigger className="w-56" aria-label="Listing">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {live.map((l) => (
                                        <SelectItem key={l.id} value={l.id}>
                                            {l.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        }
                    >
                        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">Weekly rhythm</h3>
                                <RhythmHeatmap signals={audience} />
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-muted-foreground">Crowd mix</h3>
                                    <CrowdMix signals={audience} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-muted p-3">
                                        <p className="text-sm text-muted-foreground">Average spend</p>
                                        <p className="font-display text-xl tabular">{tsh(audience.crowd.averageSpend)}</p>
                                    </div>
                                    <div className="rounded-xl bg-muted p-3">
                                        <p className="text-sm text-muted-foreground">Repeat guests</p>
                                        <p className="font-display text-xl tabular">{pct(audience.repeatRate)}</p>
                                    </div>
                                </div>
                                {!audience.crowd.visible && <p className="text-sm text-muted-foreground">Fans see the crowd mix once you have {audience.crowd.needed} bookings in 90 days.</p>}
                            </div>
                        </div>
                    </Panel>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <Panel title="Upcoming bookings" action={<Button asChild variant="link" className="px-0"><Link href="/studio/bookings">All</Link></Button>}>
                        {data.upcoming.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
                        ) : (
                            <ul className="space-y-3">
                                {data.upcoming.map((o) => (
                                    <li key={o.id} className="text-sm">
                                        <p className="font-medium">{name(o.fanId)}</p>
                                        <p className="text-muted-foreground">
                                            {byId.get(o.listingId)?.title} · {formatDateTime(o.visitAt)} · {o.guests} {o.guests === 1 ? 'guest' : 'guests'}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                    <Panel title="Latest reviews">
                        {data.latestReviews.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No reviews yet.</p>
                        ) : (
                            <ul className="space-y-4">
                                {data.latestReviews.map((r) => (
                                    <li key={r.id} className="space-y-1 text-sm">
                                        <p className="flex items-center gap-1 font-medium">
                                            <StarSolid className="size-4 text-primary" aria-hidden="true" />
                                            {r.rating} · {byId.get(r.listingId)?.title}
                                        </p>
                                        <p className="text-muted-foreground">“{r.text}”</p>
                                        <p className="text-xs text-muted-foreground">
                                            {name(r.fanId)} · {timeAgo(r.createdAt)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                    <Panel title="Waiting for a quote">
                        {data.waiting.length === 0 ? (
                            <EmptyState icon={ChatBubbleLeftRightIcon} title="All answered" className="py-6" />
                        ) : (
                            <>
                                <ul className="space-y-3">
                                    {data.waiting.map((r) => (
                                        <li key={r.id} className="text-sm">
                                            <p className="font-medium">{name(r.fanId)}</p>
                                            <p className="text-muted-foreground">
                                                {byId.get(r.listingId)?.title} · {formatDateTime(r.date)} · budget {tsh(r.budget)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                                <Button asChild size="sm">
                                    <Link href="/studio/bookings?tab=requests">
                                        <ChatBubbleLeftRightIcon />
                                        Answer requests
                                    </Link>
                                </Button>
                            </>
                        )}
                    </Panel>
                </div>
            </div>
        </>
    );
}
