import { Container } from '@/components/container';
import { LandingFooter } from '@/components/landing/closing';
import { DemoControls } from '@/components/shell/demo-controls';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ModeSwitcher } from '@/components/shell/theme-switcher';
import { Wordmark } from '@/components/shell/wordmark';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useApp, useCurrentFan } from '@/store/app-store';
import { HomeIcon, MagnifyingGlassIcon, TicketIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, MagnifyingGlassIcon as SearchSolid, TicketIcon as TicketSolid, UserCircleIcon as UserSolid } from '@heroicons/react/24/solid';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

const isHome = (u: string) => u === '/' || u.startsWith('/?') || u.startsWith('/#');

const NAV = [
    { href: '/', label: 'Home', icon: HomeIcon, active: HomeSolid, match: isHome },
    { href: '/explore', label: 'Explore', icon: MagnifyingGlassIcon, active: SearchSolid, match: (u: string) => u.startsWith('/explore') || u.startsWith('/listings') },
    { href: '/me?tab=tickets', label: 'Tickets', icon: TicketIcon, active: TicketSolid, match: (u: string) => u.startsWith('/me?tab=tickets') },
    { href: '/me', label: 'Profile', icon: UserCircleIcon, active: UserSolid, match: (u: string) => u.startsWith('/me') && !u.startsWith('/me?tab=tickets') },
];

const LINKS = [
    { href: '/explore', label: 'Explore', match: (u: string) => (u.startsWith('/explore') && !u.includes('kind=event')) || u.startsWith('/listings') },
    { href: '/explore?kind=event', label: 'Events', match: (u: string) => u.startsWith('/explore') && u.includes('kind=event') },
    { href: '/studio', label: 'For entertainers', match: () => false },
];

/** The same header as the home page, as a solid bar: the name, where to go, and the visitor's own corner. */
function FanHeader() {
    const { url } = usePage();
    const signedIn = useApp((s) => s.session.signedIn);
    const fan = useCurrentFan();

    return (
        <header className="sticky top-0 z-40 border-b bg-background">
            <Container className="flex h-16 items-center gap-2">
                <Wordmark />
                <nav aria-label="Main" className="ml-8 hidden items-center gap-1 text-sm font-medium md:flex">
                    {LINKS.map((item) => {
                        const active = item.match(url);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn('rounded-md px-3 py-2 transition-opacity duration-200', active ? 'opacity-100' : 'opacity-70 hover:opacity-100')}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    <ModeSwitcher />
                    {signedIn ? (
                        <>
                            <Link href="/me?tab=tickets" className="hidden rounded-md px-3 py-2 text-sm font-medium opacity-70 transition-opacity hover:opacity-100 sm:block">
                                My tickets
                            </Link>
                            <Link href="/me" aria-label="Your profile" className="rounded-full">
                                <Avatar>
                                    <AvatarFallback className="bg-peri-300 font-semibold text-on-peri">{initials(fan.name)}</AvatarFallback>
                                </Avatar>
                            </Link>
                        </>
                    ) : (
                        <Button asChild className="font-semibold">
                            <Link href="/join">Sign up</Link>
                        </Button>
                    )}
                </div>
            </Container>
        </header>
    );
}

function BottomNav() {
    const { url } = usePage();
    return (
        <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden">
            <ul className="grid grid-cols-4 rounded-full bg-navy-950/90 p-1.5 text-white ring-1 ring-white/10 backdrop-blur-xl">
                {NAV.map((item) => {
                    const active = item.match(url);
                    const Icon = active ? item.active : item.icon;
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn('flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[0.7rem] font-medium', active ? 'bg-peri-300 text-on-peri' : 'text-white/70')}
                            >
                                <Icon className="size-5" aria-hidden="true" />
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

export function FanLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative flex min-h-dvh flex-col">
            <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
                Skip to content
            </a>
            <FanHeader />
            <main id="main" className="flex-1">
                {children}
            </main>
            <div className="pb-24 md:pb-0 bg-navy-950">
                <LandingFooter />
            </div>
            <BottomNav />
            <DemoControls />
        </div>
    );
}
