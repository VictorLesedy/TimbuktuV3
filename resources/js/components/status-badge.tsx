import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ListingStatus } from '@/types';
import { CheckCircleIcon, ClockIcon, PauseCircleIcon, PencilSquareIcon, XCircleIcon } from '@heroicons/react/20/solid';

const STATUS: Record<ListingStatus, { label: string; icon: typeof ClockIcon; className: string }> = {
    live: { label: 'Live', icon: CheckCircleIcon, className: 'bg-live/12 text-live' },
    pending: { label: 'Waiting for approval', icon: ClockIcon, className: 'bg-secondary text-secondary-foreground' },
    changes_requested: { label: 'Changes requested', icon: PencilSquareIcon, className: 'bg-primary/12 text-primary' },
    paused: { label: 'Paused', icon: PauseCircleIcon, className: 'bg-muted text-muted-foreground' },
    rejected: { label: 'Rejected', icon: XCircleIcon, className: 'bg-destructive/10 text-destructive' },
};

export function StatusBadge({ status, className }: { status: ListingStatus | 'approved'; className?: string }) {
    const s = STATUS[status === 'approved' ? 'live' : status];
    return (
        <Badge variant="secondary" className={cn('h-6 gap-1 px-2', s.className, className)}>
            <s.icon aria-hidden="true" />
            {status === 'approved' ? 'Approved' : s.label}
        </Badge>
    );
}
