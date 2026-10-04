import type { BadgeInfo, BadgeKind } from '@/lib/signals';
import { cn } from '@/lib/utils';
import { ArrowTrendingUpIcon, CalendarDaysIcon, ChevronDoubleUpIcon, SparklesIcon, StarIcon } from '@heroicons/react/20/solid';

const ICON: Record<BadgeKind, typeof StarIcon> = {
    trending: ArrowTrendingUpIcon,
    rising: ChevronDoubleUpIcon,
    'top-rated': StarIcon,
    busiest: CalendarDaysIcon,
    new: SparklesIcon,
};

/** An earned badge. Momentum badges (trending, rising) carry the live colour; the rest stay quiet. */
export function SignalBadge({ badge, className }: { badge: BadgeInfo; className?: string }) {
    const Icon = ICON[badge.kind];
    const live = badge.kind === 'trending' || badge.kind === 'rising';
    return (
        <span
            className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold',
                live ? 'bg-peri-300 text-on-peri' : 'bg-secondary text-secondary-foreground',
                className,
            )}
        >
            <Icon className="size-3.5" aria-hidden="true" />
            {badge.label}
        </span>
    );
}
