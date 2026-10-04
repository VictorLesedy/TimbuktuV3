import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
    type CellData,
    type Column,
    type ColumnDef,
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFn_equalsString,
    filterFn_includesString,
    globalFilteringFeature,
    rowPaginationFeature,
    type RowData,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_basic,
    sortFn_datetime,
    sortFn_text,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import { ArrowDownIcon, ArrowUpIcon, ArrowsUpDownIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { type ReactNode, useState } from 'react';

export const dataTableFeatures = tableFeatures({
    columnFilteringFeature,
    globalFilteringFeature,
    rowSortingFeature,
    rowPaginationFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns: { includesString: filterFn_includesString, equalsString: filterFn_equalsString },
    sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
});

export type DataTableFeatures = typeof dataTableFeatures;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTableColumn<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;

export function columnHelper<TData extends RowData>() {
    return createColumnHelper<DataTableFeatures, TData>();
}

export interface DataTableFilter {
    columnId: string;
    label: string;
    options: { label: string; value: string }[];
}

export function SortableHeader<TData extends RowData, TValue extends CellData>({ column, title, className }: { column: Column<DataTableFeatures, TData, TValue>; title: string; className?: string }) {
    const sorted = column.getIsSorted();
    const Icon = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ArrowsUpDownIcon;

    return (
        <Button variant="ghost" size="sm" className={cn('-ml-3 h-8 px-3 font-medium', className)} onClick={() => column.toggleSorting(sorted === 'asc')}>
            {title}
            <Icon className={cn('size-3.5', !sorted && 'opacity-40')} />
        </Button>
    );
}

const PAGE_SIZES = [10, 20, 50, 100];
const ALL = '__all__';

export function DataTable<TData extends RowData>({
    columns,
    data,
    searchPlaceholder = 'Search',
    filters = [],
    toolbar,
    emptyMessage = 'Nothing here yet.',
    initialSort,
    initialSearch = '',
    onRowClick,
}: {
    columns: DataTableColumn<TData>[];
    data: TData[];
    searchPlaceholder?: string;
    filters?: DataTableFilter[];
    toolbar?: ReactNode;
    emptyMessage?: ReactNode;
    initialSort?: { id: string; desc: boolean };
    initialSearch?: string;
    onRowClick?: (row: TData) => void;
}) {
    const [globalFilter, setGlobalFilter] = useState(initialSearch);

    const table = useTable({
        features: dataTableFeatures,
        columns,
        data,
        globalFilterFn: 'includesString',
        initialState: {
            pagination: { pageIndex: 0, pageSize: 10 },
            sorting: initialSort ? [initialSort] : [],
        },
        state: { globalFilter },
        onGlobalFilterChange: (updater) => setGlobalFilter((prev) => (typeof updater === 'function' ? updater(prev) : updater) ?? ''),
    });

    const { pageIndex, pageSize } = table.state.pagination;
    const filteredCount = table.getFilteredRowModel().rows.length;
    const rows = table.getRowModel().rows;
    const firstShown = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
    const lastShown = Math.min(filteredCount, (pageIndex + 1) * pageSize);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-xs">
                        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={globalFilter}
                            onChange={(e) => {
                                setGlobalFilter(e.target.value);
                                table.setPageIndex(0);
                            }}
                            placeholder={searchPlaceholder}
                            className="h-9 pl-9"
                            aria-label={searchPlaceholder}
                        />
                    </div>
                    {filters.map((filter) => {
                        const column = table.getColumn(filter.columnId);
                        if (!column) return null;
                        const value = (column.getFilterValue() as string | undefined) ?? ALL;

                        return (
                            <Select
                                key={filter.columnId}
                                value={value}
                                onValueChange={(next) => {
                                    column.setFilterValue(next === ALL ? undefined : next);
                                    table.setPageIndex(0);
                                }}
                            >
                                <SelectTrigger className="h-9 w-full sm:w-44" aria-label={filter.label}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>{filter.label}: all</SelectItem>
                                    {filter.options.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        );
                    })}
                </div>
                {toolbar && <div className="flex shrink-0 items-center gap-2">{toolbar}</div>}
            </div>

            <div className="overflow-hidden rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((group) => (
                            <TableRow key={group.id} className="bg-muted/40 hover:bg-muted/40">
                                {group.headers.map((header) => (
                                    <TableHead key={header.id} className="h-11 whitespace-nowrap">
                                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                                    {globalFilter || table.state.columnFilters.length > 0 ? 'No results match your search.' : emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className={cn(onRowClick && 'cursor-pointer')}
                                    onClick={onRowClick ? (e) => !(e.target as HTMLElement).closest('a,button,[role=menuitem]') && onRowClick(row.original) : undefined}
                                >
                                    {row.getAllCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-4 py-3">
                                            <table.FlexRender cell={cell} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                    {filteredCount === 0 ? 'No rows' : `Showing ${firstShown} to ${lastShown} of ${filteredCount}`}
                    {filteredCount !== data.length && ` (filtered from ${data.length})`}
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-2">
                        <span>Rows per page</span>
                        <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
                            <SelectTrigger className="h-8 w-[4.5rem]" aria-label="Rows per page">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZES.map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <span>
                        Page {table.getPageCount() === 0 ? 0 : pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="size-8" onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()} aria-label="First page">
                            <ChevronDoubleLeftIcon />
                        </Button>
                        <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
                            <ChevronLeftIcon />
                        </Button>
                        <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
                            <ChevronRightIcon />
                        </Button>
                        <Button variant="outline" size="icon" className="size-8" onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} aria-label="Last page">
                            <ChevronDoubleRightIcon />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
