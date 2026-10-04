import { cn } from '@/lib/utils';
import type { ComponentType, ReactNode, SVGProps } from 'react';

export function EmptyState({
    icon: Icon,
    title,
    body,
    action,
    className,
}: {
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    body?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center', className)}>
            {Icon && <Icon className="size-7 text-muted-foreground" aria-hidden="true" />}
            <div className="space-y-1">
                <p className="font-semibold">{title}</p>
                {body && <p className="mx-auto max-w-md text-sm text-muted-foreground">{body}</p>}
            </div>
            {action}
        </div>
    );
}

export function StatCard({ label, value, sub, icon: Icon, className }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ComponentType<SVGProps<SVGSVGElement>>; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-1 rounded-xl border bg-card p-4 md:p-5', className)}>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                {Icon && <Icon className="size-4" aria-hidden="true" />}
                {label}
            </span>
            <span className="font-display text-2xl tabular md:text-3xl">{value}</span>
            {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
        </div>
    );
}
