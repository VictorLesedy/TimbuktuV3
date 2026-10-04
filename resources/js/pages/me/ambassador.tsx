import { TimeBars } from '@/components/charts';
import { DataTable, SortableHeader, type DataTableColumn } from '@/components/data-table';
import { StatCard } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WithdrawDialog } from '@/components/withdraw-dialog';
import { DAY, formatDate, formatDayMonth, pct, startOfDay, tsh } from '@/lib/format';
import { useApp, useCurrentFan } from '@/store/app-store';
import type { Order } from '@/types';
import { ArrowLeftIcon, BanknotesIcon, CheckCircleIcon, ClipboardDocumentIcon, LinkIcon, MegaphoneIcon, TicketIcon } from '@heroicons/react/24/outline';
import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';
import { toast } from 'sonner';

interface SaleRow {
    id: string;
    date: string;
    listing: string;
    sale: number;
    earned: number;
}

export default function Ambassador() {
    const fan = useCurrentFan();
    const signedIn = useApp((s) => s.session.signedIn);
    const orders = useApp((s) => s.orders);
    const listings = useApp((s) => s.listings);
    const payouts = useApp((s) => s.payouts);
    const reviews = useApp((s) => s.reviews);
    const share = useApp((s) => s.settings.ambassadorShare);
    const joinAmbassador = useApp((s) => s.joinAmbassador);

    const data = useMemo(() => {
        const referred: Order[] = orders.filter((o) => o.referredBy === fan.referralCode);
        const earned = referred.reduce((s, o) => s + o.split.ambassador, 0);
        const paidOut = payouts.filter((p) => p.party === 'ambassador' && p.ownerId === fan.id);
        const balance = earned - paidOut.reduce((s, p) => s + p.amount, 0);
        const weekStart = startOfDay(Date.now() - ((new Date().getDay() + 6) % 7) * DAY).getTime();
        const weeks = Array.from({ length: 12 }, (_, i) => {
            const from = weekStart - (11 - i) * 7 * DAY;
            const to = from + 7 * DAY;
            return {
                week: formatDayMonth(from),
                earned: referred.filter((o) => {
                    const t = new Date(o.createdAt).getTime();
                    return t >= from && t < to;
                }).reduce((s, o) => s + o.split.ambassador, 0),
            };
        });
        const byId = new Map(listings.map((l) => [l.id, l.title]));
        const rows: SaleRow[] = referred.map((o) => ({ id: o.id, date: o.createdAt, listing: byId.get(o.listingId) ?? '', sale: o.total, earned: o.split.ambassador }));
        const mine = orders.filter((o) => o.fanId === fan.id);
        return {
            referred,
            earned,
            paidOut,
            balance,
            weeks,
            rows,
            attended: mine.filter((o) => o.checkedInAt).length,
            reviewed: reviews.filter((r) => r.fanId === fan.id).length,
        };
    }, [orders, payouts, listings, reviews, fan.id, fan.referralCode]);

    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${fan.referralCode}`;
    const columns: DataTableColumn<SaleRow>[] = [
        { accessorKey: 'date', header: ({ column }) => <SortableHeader column={column} title="Date" />, cell: ({ row }) => formatDate(row.original.date), sortFn: 'datetime' },
        { accessorKey: 'listing', header: 'Listing' },
        { accessorKey: 'sale', header: ({ column }) => <SortableHeader column={column} title="Sale" />, cell: ({ row }) => <span className="tabular">{tsh(row.original.sale)}</span> },
        { accessorKey: 'earned', header: ({ column }) => <SortableHeader column={column} title="You earned" />, cell: ({ row }) => <span className="font-medium tabular">{tsh(row.original.earned)}</span> },
    ];

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Link copied');
        } catch {
            toast.error('Could not copy the link');
        }
    };

    if (!signedIn || fan.level !== 'ambassador') {
        const ready = data.attended >= 3 && data.reviewed >= 1;
        return (
            <div className="mx-auto max-w-2xl space-y-8 px-4 py-12 md:py-16">
                <Head title="Ambassador programme" />
                <div className="space-y-4">
                    <MegaphoneIcon className="size-10 text-primary" aria-hidden="true" />
                    <h1 className="font-display text-3xl md:text-4xl">Share Timbuktu, earn from every sale.</h1>
                    <p className="text-lg text-muted-foreground">
                        Ambassadors get a personal link. When a friend books through it, you earn {pct(share)} of the sale, paid from Timbuktu’s commission. Follow your earnings week by week and
                        withdraw to mobile money.
                    </p>
                </div>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                        <CheckCircleIcon className={data.attended >= 3 ? 'size-6 text-live' : 'size-6 text-muted-foreground'} aria-hidden="true" />
                        Attend three times ({Math.min(3, data.attended)} of 3)
                    </li>
                    <li className="flex items-center gap-3">
                        <CheckCircleIcon className={data.reviewed >= 1 ? 'size-6 text-live' : 'size-6 text-muted-foreground'} aria-hidden="true" />
                        Leave one review ({Math.min(1, data.reviewed)} of 1)
                    </li>
                </ul>
                {!signedIn ? (
                    <Button asChild size="xl">
                        <Link href="/join">Create an account first</Link>
                    </Button>
                ) : (
                    <Button
                        size="xl"
                        disabled={!ready}
                        onClick={() => {
                            joinAmbassador();
                            toast.success('You are an ambassador', { description: 'Your personal link is ready.' });
                        }}
                    >
                        Become an ambassador
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6 md:py-12">
            <Head title="Ambassador" />
            <div className="space-y-3">
                <Button asChild variant="link" className="px-0">
                    <Link href="/me">
                        <ArrowLeftIcon />
                        Profile
                    </Link>
                </Button>
                <h1 className="font-display text-3xl md:text-4xl">Ambassador</h1>
                <p className="text-muted-foreground">You earn {pct(share)} of every sale your link brings in.</p>
            </div>

            <section className="space-y-3 rounded-2xl bg-primary p-5 text-primary-foreground md:p-6">
                <h2 className="flex items-center gap-2 font-semibold">
                    <LinkIcon className="size-5" aria-hidden="true" />
                    Your link
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Input readOnly value={link} aria-label="Your ambassador link" className="h-11 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground" onFocus={(e) => e.target.select()} />
                    <Button variant="secondary" size="lg" className="h-11" onClick={copy}>
                        <ClipboardDocumentIcon />
                        Copy
                    </Button>
                    <Button asChild variant="secondary" size="lg" className="h-11">
                        <a href={`https://wa.me/?text=${encodeURIComponent(`Ninatumia Timbuktu kupanga matembezi. Angalia hapa: ${link}`)}`} target="_blank" rel="noreferrer">
                            Share on WhatsApp
                        </a>
                    </Button>
                </div>
                <p className="text-sm opacity-90">Code {fan.referralCode}. Any listing link you share from the app carries it too.</p>
            </section>

            <div className="grid gap-3 sm:grid-cols-3">
                <StatCard icon={TicketIcon} label="Sales from your link" value={data.referred.length} sub={tsh(data.referred.reduce((s, o) => s + o.total, 0))} />
                <StatCard icon={MegaphoneIcon} label="Earned in total" value={tsh(data.earned)} />
                <StatCard icon={BanknotesIcon} label="Available to withdraw" value={tsh(data.balance)} />
            </div>

            <section className="space-y-4 rounded-2xl border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold">Earnings by week</h2>
                    <WithdrawDialog party="ambassador" ownerId={fan.id} balance={data.balance} phone={fan.phone} />
                </div>
                <TimeBars data={data.weeks} xKey="week" config={{ earned: { label: 'Earned', color: 'var(--chart-1)' } }} money />
                <p className="sr-only">
                    Weekly earnings for the last 12 weeks: {data.weeks.map((w) => `${w.week}: ${tsh(w.earned)}`).join(', ')}.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="font-semibold">Sales from your link</h2>
                <DataTable columns={columns} data={data.rows} searchPlaceholder="Search listings" initialSort={{ id: 'date', desc: true }} emptyMessage="No sales yet. Share your link to get started." />
            </section>

            <section className="space-y-3">
                <h2 className="font-semibold">Withdrawals</h2>
                {data.paidOut.length === 0 ? (
                    <p className="text-muted-foreground">No withdrawals yet.</p>
                ) : (
                    <ul className="divide-y rounded-2xl border">
                        {[...data.paidOut].reverse().map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-3 p-4">
                                <span>
                                    <span className="block font-medium">{p.network}</span>
                                    <span className="block text-sm text-muted-foreground">
                                        {formatDate(p.at)} · {p.phone}
                                    </span>
                                </span>
                                <span className="font-semibold tabular">{tsh(p.amount)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
