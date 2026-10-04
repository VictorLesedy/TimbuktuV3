import { DataTable, SortableHeader, type DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ticketCode } from '@/components/fan/ticket';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/layouts/console-layout';
import { DAY, formatDateLong, formatDateTime, isoDay, timeAgo, tsh } from '@/lib/format';
import { useHostData } from '@/lib/studio';
import { useQuery, useSetQuery } from '@/lib/url-state';
import { useApp } from '@/store/app-store';
import type { HireRequest } from '@/types';
import { ChatBubbleLeftRightIcon, CheckCircleIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Row {
    id: string;
    guest: string;
    phone: string;
    listing: string;
    visitAt: string;
    code: string;
    items: string;
    paid: number;
    status: string;
}

function QuoteDialog({ req, title }: { req: HireRequest; title: string }) {
    const sendQuote = useApp((s) => s.sendQuote);
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState(String(req.budget));
    const [terms, setTerms] = useState('Includes sound system and travel within the city. 50% is non-refundable within 7 days of the date.');
    const [expires, setExpires] = useState(isoDay(Date.now() + 5 * DAY));
    const [error, setError] = useState('');
    const submit = () => {
        if (!(Number(price) > 0)) return setError('Enter a price in shillings.');
        if (terms.trim().length < 10) return setError('Write the terms the fan is agreeing to.');
        const exp = new Date(`${expires}T23:59:00`);
        if (exp.getTime() < Date.now() || exp.getTime() > new Date(req.date).getTime()) return setError('The quote must expire after today and before the event.');
        sendQuote(req.id, { price: Number(price), terms: terms.trim(), expiresAt: exp.toISOString() });
        setOpen(false);
        toast.success('Quote sent', { description: 'The fan can accept and pay from their profile.' });
    };
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Send a quote</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Quote for {title}</DialogTitle>
                    <DialogDescription>
                        {formatDateLong(req.date)} · {req.location} · budget {tsh(req.budget)}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="q-price">Price (TSh)</Label>
                            <Input id="q-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="q-exp">Valid until</Label>
                            <Input id="q-exp" type="date" value={expires} min={isoDay(Date.now())} max={isoDay(req.date)} onChange={(e) => setExpires(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="q-terms">Terms</Label>
                        <Textarea id="q-terms" rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button onClick={submit}>Send quote</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeclineButton({ req }: { req: HireRequest }) {
    const declineHire = useApp((s) => s.declineHire);
    const [reason, setReason] = useState('');
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline">Decline</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Decline this request?</AlertDialogTitle>
                    <AlertDialogDescription>The fan is told straight away. A short reason helps them look elsewhere.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    <Label htmlFor={`decline-${req.id}`}>Reason</Label>
                    <Input id={`decline-${req.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Already booked that day" />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => {
                            declineHire(req.id, reason.trim() || 'Not available');
                            toast('Request declined');
                        }}
                    >
                        Decline request
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function RequestCard({ r, fanName, title }: { r: HireRequest; fanName: string; title: string }) {
    return (
        <article className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="font-semibold">{fanName}</p>
                    <p className="text-sm text-muted-foreground">
                        For {title} · asked {timeAgo(r.timeline[0]!.at)}
                    </p>
                </div>
                <Badge variant={r.status === 'requested' ? 'default' : 'secondary'} className="capitalize">
                    {r.status === 'paid' ? 'Booked and paid' : r.status}
                </Badge>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-4">
                <div>
                    <dt className="text-muted-foreground">Date</dt>
                    <dd className="font-medium">{formatDateLong(r.date)}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Where</dt>
                    <dd className="flex items-center gap-1 font-medium">
                        <MapPinIcon className="size-4" aria-hidden="true" />
                        {r.location}
                    </dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Hours</dt>
                    <dd className="font-medium">{r.hours}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Budget</dt>
                    <dd className="font-medium tabular">{tsh(r.budget)}</dd>
                </div>
            </dl>
            <p className="rounded-xl bg-muted p-3 text-sm">“{r.message}”</p>
            {r.quote && (
                <p className="text-sm text-muted-foreground">
                    Quoted {tsh(r.quote.price)}, valid until {formatDateTime(r.quote.expiresAt)}.
                </p>
            )}
            {r.status === 'requested' && (
                <div className="flex flex-wrap gap-2">
                    <QuoteDialog req={r} title={fanName} />
                    <DeclineButton req={r} />
                </div>
            )}
        </article>
    );
}

export default function StudioBookings() {
    const query = useQuery();
    const setQuery = useSetQuery();
    const tab = query.get('tab') ?? 'bookings';
    const { listings, byId, orders } = useHostData();
    const fans = useApp((s) => s.fans);
    const hireRequests = useApp((s) => s.hireRequests);
    const fanById = useMemo(() => new Map(fans.map((f) => [f.id, f])), [fans]);

    const rows = useMemo<Row[]>(
        () =>
            orders
                .filter((o) => !o.hireRequestId)
                .map((o) => ({
                    id: o.id,
                    guest: fanById.get(o.fanId)?.name ?? 'Guest',
                    phone: o.phone,
                    listing: byId.get(o.listingId)?.title ?? '',
                    visitAt: o.visitAt,
                    code: ticketCode(o),
                    items: o.lines.map((l) => `${l.qty} × ${l.label}`).join(', '),
                    paid: o.total,
                    status: o.checkedInAt ? 'Checked in' : new Date(o.visitAt).getTime() < Date.now() - DAY ? 'No show' : 'Upcoming',
                })),
        [orders, byId, fanById],
    );

    const requests = useMemo(() => {
        const ids = new Set(listings.map((l) => l.id));
        return hireRequests.filter((r) => ids.has(r.listingId)).sort((a, b) => b.timeline[0]!.at.localeCompare(a.timeline[0]!.at));
    }, [hireRequests, listings]);
    const open = requests.filter((r) => r.status === 'requested');
    const others = requests.filter((r) => r.status !== 'requested');

    const columns: DataTableColumn<Row>[] = [
        {
            accessorKey: 'guest',
            header: ({ column }) => <SortableHeader column={column} title="Guest" />,
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.guest}</p>
                    <p className="text-xs text-muted-foreground">{row.original.phone}</p>
                </div>
            ),
        },
        { accessorKey: 'listing', header: 'Listing', filterFn: 'equalsString' },
        { accessorKey: 'visitAt', header: ({ column }) => <SortableHeader column={column} title="Date" />, cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.visitAt)}</span>, sortFn: 'text' },
        { accessorKey: 'items', header: 'Booked' },
        { accessorKey: 'code', header: 'Ticket code', cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span> },
        { accessorKey: 'paid', header: ({ column }) => <SortableHeader column={column} title="Paid" />, cell: ({ row }) => <span className="tabular">{tsh(row.original.paid)}</span> },
        {
            accessorKey: 'status',
            header: 'Status',
            filterFn: 'equalsString',
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'Checked in' ? 'default' : 'secondary'} className="gap-1">
                    {row.original.status === 'Checked in' ? <CheckCircleIcon aria-hidden="true" /> : <ClockIcon aria-hidden="true" />}
                    {row.original.status}
                </Badge>
            ),
        },
    ];

    return (
        <>
            <Head title="Bookings" />
            <PageHeader title="Bookings" description="Every ticket and booking in one table, and hire requests in their own inbox." />
            <Tabs value={tab} onValueChange={(v) => setQuery({ tab: v === 'bookings' ? null : v })} className="gap-6">
                <TabsList>
                    <TabsTrigger value="bookings" className="px-4">
                        Tickets and bookings
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="px-4">
                        Hire requests {open.length > 0 && <Badge className="ml-1 tabular">{open.length}</Badge>}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="bookings">
                    <DataTable
                        columns={columns}
                        data={rows}
                        searchPlaceholder="Search guest, phone or ticket code"
                        initialSort={{ id: 'visitAt', desc: true }}
                        filters={[
                            { columnId: 'listing', label: 'Listing', options: listings.filter((l) => l.kind !== 'professional').map((l) => ({ value: l.title, label: l.title })) },
                            { columnId: 'status', label: 'Status', options: ['Upcoming', 'Checked in', 'No show'].map((v) => ({ value: v, label: v })) },
                        ]}
                    />
                </TabsContent>
                <TabsContent value="requests" className="space-y-8">
                    <section className="space-y-3">
                        <h2 className="font-semibold">Waiting for your quote</h2>
                        {open.length === 0 ? <EmptyState icon={ChatBubbleLeftRightIcon} title="All answered" body="New hire requests appear here with the date, place, hours, budget and the fan’s message." /> : open.map((r) => <RequestCard key={r.id} r={r} fanName={fanById.get(r.fanId)?.name ?? 'Fan'} title={byId.get(r.listingId)?.title ?? ''} />)}
                    </section>
                    {others.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="font-semibold">Answered</h2>
                            {others.slice(0, 12).map((r) => (
                                <RequestCard key={r.id} r={r} fanName={fanById.get(r.fanId)?.name ?? 'Fan'} title={byId.get(r.listingId)?.title ?? ''} />
                            ))}
                        </section>
                    )}
                </TabsContent>
            </Tabs>
        </>
    );
}
