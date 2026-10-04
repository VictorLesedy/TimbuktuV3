import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

/** The mark: an admit-one ticket with its half-moon notches and perforations, in the current text colour. */
export function Mark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7', className)}>
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M6 6h20a3 3 0 0 1 3 3v4.5a2.5 2.5 0 0 0 0 5V23a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4.5a2.5 2.5 0 0 0 0-5V9a3 3 0 0 1 3-3Zm15 4.5a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm0 4.6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm0 4.6a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Z"
            />
        </svg>
    );
}

export function Wordmark({ href = '/', className }: { href?: string; className?: string }) {
    return (
        <Link href={href} className={cn('flex items-center gap-2 rounded-md', className)} aria-label="Timbuktu home">
            <Mark />
            <span className="font-display text-[1.6rem] leading-none">timbuktu</span>
        </Link>
    );
}
