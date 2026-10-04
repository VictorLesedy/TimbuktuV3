import { Container } from '@/components/container';
import { Wordmark } from '@/components/shell/wordmark';
import { Button } from '@/components/ui/button';
import { initials } from '@/lib/format';
import { useApp, useCurrentFan } from '@/store/app-store';
import { Link } from '@inertiajs/react';

/**
 * The landing header: clear over the dark hero, then a solid bar whose colours follow
 * the section underneath it (the page sets data-tone on this element as you scroll).
 */
export function Nav() {
    const signedIn = useApp((s) => s.session.signedIn);
    const fan = useCurrentFan();
    return (
        <header
            data-nav
            data-tone="dark"
            data-solid="false"
            className="group/nav fixed inset-x-0 top-0 z-50 transition-[background-color,color,box-shadow] duration-300 data-[tone=dark]:text-white data-[tone=light]:text-navy-900 data-[solid=true]:data-[tone=dark]:bg-navy-950/90 data-[tone=light]:bg-white/90 data-[tone=light]:shadow-[0_1px_0_rgb(0_0_0/0.06)] data-[solid=true]:backdrop-blur-lg"
        >
            <Container className="flex h-16 items-center gap-2">
                <Wordmark />
                <nav aria-label="Main" className="ml-8 hidden items-center gap-1 text-sm font-medium md:flex">
                    <Link href="/explore" className="rounded-md px-3 py-2 opacity-75 transition-opacity hover:opacity-100">
                        Explore
                    </Link>
                    <Link href="/explore?kind=event" className="rounded-md px-3 py-2 opacity-75 transition-opacity hover:opacity-100">
                        Events
                    </Link>
                    <Link href="/studio" className="rounded-md px-3 py-2 opacity-75 transition-opacity hover:opacity-100">
                        For entertainers
                    </Link>
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    {signedIn ? (
                        <>
                            <Link href="/me?tab=tickets" className="hidden rounded-md px-3 py-2 text-sm font-medium opacity-75 hover:opacity-100 sm:block">
                                My tickets
                            </Link>
                            <Button asChild variant="accent" size="icon" className="font-bold">
                                <Link href="/me" aria-label="Your profile">
                                    {initials(fan.name)}
                                </Link>
                            </Button>
                        </>
                    ) : (
                        <Button
                            asChild
                            className="font-semibold group-data-[tone=dark]/nav:bg-white group-data-[tone=dark]/nav:text-navy-900 group-data-[tone=dark]/nav:hover:bg-white/90 group-data-[tone=light]/nav:bg-navy-900 group-data-[tone=light]/nav:text-white group-data-[tone=light]/nav:hover:bg-navy-800"
                        >
                            <Link href="/join">Sign up</Link>
                        </Button>
                    )}
                </div>
            </Container>
        </header>
    );
}
