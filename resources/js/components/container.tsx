import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** The one page container: max-w-7xl with the same side padding at every breakpoint, everywhere on the site. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
