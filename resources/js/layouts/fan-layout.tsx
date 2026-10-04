import { DemoControls } from '@/components/shell/demo-controls';
import { ModeSwitcher } from '@/components/shell/theme-switcher';
import { Mark, Wordmark } from '@/components/shell/wordmark';
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

/** A floating pill that sits over the page. Over the dark home hero it is always the night version. */
function FanHeader() {
    const { url } = usePage();
    const signedIn = useApp((s) => s.session.signedIn);
    const fan = useCurrentFan();
    const night = isHome(url);

    return (
        <header className={cn('z-40 w-full px-3 pt-3 md:px-6', night ? 'absolute inset-x-0 top-0' : 'sticky top-0')}>
            <div
                className={cn(
                    'mx-auto flex h-14 max-w-[1320px] items-center gap-1 rounded-full pr-2 pl-5 backdrop-blur-xl',
                    night ? 'bg-night/70 text-white ring-1 ring-white/10' : 'bg-background/80 ring-1 ring-border shadow-card',
                )}
            >
                <Wordmark className={night ? 'text-white [&_svg]:text-night' : '[&_svg]:text-foreground'} />
                <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
                    {[
                        { href: '/explore', label: 'Explore', match: NAV[1]!.match },
                        { href: '/me?tab=tickets', label: 'Tickets', match: NAV[2]!.match },
                        { href: '/studio', label: 'For entertainers', match: () => false },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={item.match(url) ? 'page' : undefined}
                            className={cn(
                                'rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200',
                                night ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                                item.match(url) && (night ? 'text-white' : 'bg-secondary text-foreground'),
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="ml-auto flex items-center gap-1">
                    <ModeSwitcher className={night ? 'text-white hover:bg-white/10 hover:text-white' : undefined} />
                    {signedIn ? (
                        <Link href="/me" aria-label="Your profile" className="ml-1 grid size-10 place-items-center rounded-full bg-lime text-sm font-bold text-night">
                            {initials(fan.name)}
                        </Link>
                    ) : (
                        <Link href="/join" className="ml-1 flex h-10 items-center rounded-full bg-lime px-5 text-sm font-semibold text-night transition-transform duration-150 active:scale-[0.97]">
                            Sign up
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}

function BottomNav() {
    const { url } = usePage();
    return (
        <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden">
            <ul className="grid grid-cols-4 rounded-full bg-night/90 p-1.5 text-white ring-1 ring-white/10 backdrop-blur-xl">
                {NAV.map((item) => {
                    const active = item.match(url);
                    const Icon = active ? item.active : item.icon;
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn('flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[0.7rem] font-medium', active ? 'bg-lime text-night' : 'text-white/70')}
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

function Footer() {
    const cols: [string, [string, string][]][] = [
        [
            'Going out',
            [
                ['Explore', '/explore'],
                ['Your tickets', '/me?tab=tickets'],
                ['Ambassadors', '/me/ambassador'],
                ['Sign up', '/join'],
            ],
        ],
        [
            'Entertainers',
            [
                ['Studio', '/studio'],
                ['Create a listing', '/studio/listings/new'],
                ['Door check-in', '/studio/check-in'],
                ['Join', '/join?as=entertainer'],
            ],
        ],
        [
            'Cities',
            [
                ['Dar es Salaam', '/explore?city=Dar+es+Salaam'],
                ['Arusha', '/explore?city=Arusha'],
                ['Zanzibar', '/explore?city=Zanzibar'],
                ['Dodoma', '/explore?city=Dodoma'],
            ],
        ],
    ];
    return (
        <footer className="bg-night text-white">
            <div className="mx-auto grid max-w-[1320px] gap-12 px-4 pt-20 pb-10 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-8">
                <div className="space-y-4">
                    <Link href="/" className="flex items-center gap-3" aria-label="Timbuktu home">
                        <Mark className="size-12 text-night" />
                        <span className="font-display text-6xl">timbuktu</span>
                    </Link>
                    <p className="max-w-xs text-mist">Every kind of good time in Tanzania, in one app. Prices in shillings, paid with mobile money.</p>
                </div>
                {cols.map(([title, links]) => (
                    <div key={title} className="space-y-4">
                        <h2 className="text-sm font-semibold text-white/60">{title}</h2>
                        <ul className="space-y-2.5">
                            {links.map(([label, href]) => (
                                <li key={href}>
                                    <Link href={href} className="rounded-sm text-white/90 hover:text-lime">
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <p className="mx-auto max-w-[1320px] px-4 pb-32 text-sm text-white/50 md:px-8 md:pb-10">Sample listings for the demo. Photos from Unsplash, credited on each listing.</p>
        </footer>
    );
}

export function FanLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative flex min-h-dvh flex-col">
            <a href="#main" className="sr-only z-50 rounded-full bg-lime px-4 py-2 text-night focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
                Skip to content
            </a>
            <FanHeader />
            <main id="main" className="flex-1">
                {children}
            </main>
            <Footer />
            <BottomNav />
            <DemoControls />
        </div>
    );
}
