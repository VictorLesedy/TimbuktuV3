import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { MapIcon } from '@heroicons/react/24/outline';
import { Head, Link } from '@inertiajs/react';

export default function NotFound() {
    return (
        <>
            <Head title="Page not found" />
            <div className="mx-auto max-w-xl px-4 py-24">
                <EmptyState
                    icon={MapIcon}
                    title="This page is not here"
                    body="The link may be old, or the listing may have been taken down."
                    action={
                        <Button asChild>
                            <Link href="/explore">See what's on</Link>
                        </Button>
                    }
                />
            </div>
        </>
    );
}
