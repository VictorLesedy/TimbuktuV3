import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { compact } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

type Row = Record<string, string | number>;

/** Bars over time. Each series key in `config` becomes a bar; stack them with `stacked`. */
export function TimeBars({ data, config, xKey, className, stacked, money }: { data: Row[]; config: ChartConfig; xKey: string; className?: string; stacked?: boolean; money?: boolean }) {
    const keys = Object.keys(config);
    return (
        <ChartContainer config={config} className={cn('aspect-auto h-64 w-full', className)}>
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => compact(v)} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={money ? (v, name) => `${config[name as string]?.label ?? name}: TSh ${Number(v).toLocaleString('en')}` : undefined} />} />
                {keys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {keys.map((k, i) => (
                    <Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={stacked && i < keys.length - 1 ? 0 : [4, 4, 0, 0]} stackId={stacked ? 'a' : undefined} />
                ))}
            </BarChart>
        </ChartContainer>
    );
}

export function TimeArea({ data, config, xKey, className }: { data: Row[]; config: ChartConfig; xKey: string; className?: string }) {
    const keys = Object.keys(config);
    return (
        <ChartContainer config={config} className={cn('aspect-auto h-64 w-full', className)}>
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                {keys.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
                {keys.map((k) => (
                    <Area key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} fill={`var(--color-${k})`} fillOpacity={0.18} strokeWidth={2} />
                ))}
            </AreaChart>
        </ChartContainer>
    );
}
