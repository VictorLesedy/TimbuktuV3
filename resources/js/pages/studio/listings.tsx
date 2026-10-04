import { DataTable, SortableHeader, type DataTableColumn } from '@/components/data-table';
import { Photo } from '@/components/listing/photo';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/layouts/console-layout';
import { tsh } from '@/lib/format';
import { KIND_INFO, listingUrl } from '@/lib/kinds';
import { priceFrom, useSignals } from '@/lib/signals';
import { useHostData } from '@/lib/studio';
import type { Listing } from '@/types';
import { EyeIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';

interface Row {
    listing: Listing;
    title: string;
    kind: string;
    status: string;
    bookings: number;
    revenue: number;
    rating: number;
    price: number;
}

export default function StudioListings() {
    const { listings, orders } = useHostData();
    const signals = useSignals();

    const rows = useMemo<Row[]>(
        () =>
            listings.map((l) => {
                const own = orders.filter((o) => o.listingId === l.id);
                return {
                    listing: l,
                    title: l.title,
                    kind: l.kind,
                    status: l.status,
                    bookings: own.length,
                    revenue: own.reduce((s, o) => s + o.split.entertainer, 0),
                    rating: signals.get(l.id)?.rating.average ?? 0,
                    price: priceFrom(l),
                };
            }),
        [listings, orders, signals],
    );

    const columns: DataTableColumn<Row>[] = [
        {
            accessorKey: 'title',
            header: ({ column }) => <SortableHeader column={column} title="Listing" />,
            cell: ({ row }) => (
                <div className="flex min-w-56 items-center gap-3">
                    <Photo photo={row.original.listing.photos[0]!} width={120} ratio={1} className="size-11 shrink-0 rounded-lg" sizes="44px" />
                    <div className="min-w-0">
                        <p className="truncate font-medium">{row.original.title}</p>
                        <p className="text-xs text-muted-foreground">
                            {row.original.listing.area}, {row.original.listing.city}
                        </p>
                    </div>
                </div>
            ),
        },
        { accessorKey: 'kind', header: 'Kind', cell: ({ row }) => KIND_INFO[row.original.listing.kind].label, filterFn: 'equalsString' },
        {
            accessorKey: 'status',
            header: 'Status',
            filterFn: 'equalsString',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <StatusBadge status={row.original.listing.status} />
                    {row.original.listing.reviewNote && <p className="max-w-64 text-xs text-muted-foreground">“{row.original.listing.reviewNote}”</p>}
                </div>
            ),
        },
        { accessorKey: 'price', header: ({ column }) => <SortableHeader column={column} title="From" />, cell: ({ row }) => <span className="tabular">{tsh(row.original.price)}</span> },
        { accessorKey: 'bookings', header: ({ column }) => <SortableHeader column={column} title="Bookings" />, cell: ({ row }) => <span className="tabular">{row.original.bookings}</span> },
        { accessorKey: 'revenue', header: ({ column }) => <SortableHeader column={column} title="Your earnings" />, cell: ({ row }) => <span className="tabular">{tsh(row.original.revenue)}</span> },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`View ${row.original.title}`}>
                        <Link href={listingUrl(row.original.listing)}>
                            <EyeIcon />
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${row.original.title}`}>
                        <Link href={`/studio/listings/${row.original.listing.id}/edit`}>
                            <PencilSquareIcon />
                        </Link>
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Listings" />
            <PageHeader
                title="Listings"
                description="Everything you sell on Timbuktu. New listings and edits go to the Timbuktu team for approval."
                actions={
                    <Button asChild>
                        <Link href="/studio/listings/new">
                            <PlusIcon />
                            New listing
                        </Link>
                    </Button>
                }
            />
            <DataTable
                columns={columns}
                data={rows}
                searchPlaceholder="Search your listings"
                filters={[
                    { columnId: 'kind', label: 'Kind', options: Object.entries(KIND_INFO).map(([value, k]) => ({ value, label: k.label })) },
                    {
                        columnId: 'status',
                        label: 'Status',
                        options: [
                            { value: 'live', label: 'Live' },
                            { value: 'pending', label: 'Waiting for approval' },
                            { value: 'changes_requested', label: 'Changes requested' },
                            { value: 'paused', label: 'Paused' },
                            { value: 'rejected', label: 'Rejected' },
                        ],
                    },
                ]}
                emptyMessage="No listings yet. Create your first one."
            />
        </>
    );
}
