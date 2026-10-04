import { DemoControls } from '@/components/shell/demo-controls';
import { ModeSwitcher } from '@/components/shell/theme-switcher';
import { Mark } from '@/components/shell/wordmark';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useApp, useCurrentHost } from '@/store/app-store';
import {
    ArrowTopRightOnSquareIcon,
    BanknotesIcon,
    Bars3Icon,
    CalendarDaysIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    InboxStackIcon,
    QrCodeIcon,
    RectangleStackIcon,
    ShieldCheckIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import type { ComponentType, ReactNode, SVGProps } from 'react';

type Area = 'studio' | 'admin';
interface NavItem {
    href: string;
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    count?: number;
}

function useNav(area: Area): NavItem[] {
    const hostId = useApp((s) => s.session.hostId);
    const openRequests = useApp((s) => {
        const own = new Set(s.listings.filter((l) => l.hostId === hostId).map((l) => l.id));
        return s.hireRequests.filter((r) => own.has(r.listingId) && r.status === 'requested').length;
    });
    const pending = useApp((s) => s.listings.filter((l) => l.status === 'pending').length + s.hosts.filter((h) => h.profileStatus === 'pending').length);
    if (area === 'studio') {
        return [
            { href: '/studio', label: 'Overview', icon: Squares2X2Icon },
            { href: '/studio/listings', label: 'Listings', icon: RectangleStackIcon },
            { href: '/studio/bookings', label: 'Bookings', icon: CalendarDaysIcon, count: openRequests },
            { href: '/studio/check-in', label: 'Door check-in', icon: QrCodeIcon },
            { href: '/studio/payouts', label: 'Payouts', icon: BanknotesIcon },
        ];
    }
    return [
        { href: '/admin', label: 'Overview', icon: Squares2X2Icon },
        { href: '/admin/approvals', label: 'Approvals', icon: ShieldCheckIcon, count: pending },
        { href: '/admin/listings', label: 'Listings', icon: InboxStackIcon },
        { href: '/admin/revenue', label: 'Revenue', icon: ChartBarIcon },
        { href: '/admin/settings', label: 'Settings', icon: Cog6ToothIcon },
    ];
}

function isActive(url: string, href: string) {
    const path = url.split('?')[0]!;
    if (href === '/studio' || href === '/admin') return path === href;
    return path === href || path.startsWith(`${href}/`);
}

function NavList({ items, url }: { items: NavItem[]; url: string }) {
    return (
        <ul className="space-y-1">
            {items.map((item) => {
                const active = isActive(url, item.href);
                return (
                    <li key={item.href}>
                        <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                                active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                            )}
                        >
                            <item.icon className="size-5" aria-hidden="true" />
                            {item.label}
                            {item.count ? (
                                <Badge className="ml-auto tabular" aria-label={`${item.count} waiting`}>
                                    {item.count}
                                </Badge>
                            ) : null}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}

function Identity({ area }: { area: Area }) {
    const host = useCurrentHost();
    const name = area === 'studio' ? host.name : 'Timbuktu team';
    const sub = area === 'studio' ? 'Entertainer studio' : 'Admin console';
    return (
        <div className="flex items-center gap-3">
            <Avatar className="size-9">
                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{area === 'studio' ? initials(name) : 'TT'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted-foreground">{sub}</p>
            </div>
        </div>
    );
}

export function ConsoleLayout({ area, children }: { area: Area; children: ReactNode }) {
    const { url } = usePage();
    const items = useNav(area);
    const title = area === 'studio' ? 'Studio' : 'Admin';

    const sidebar = (
        <div className="flex h-full flex-col gap-6 p-4">
            <Link href={area === 'studio' ? '/studio' : '/admin'} className="flex items-center gap-2 rounded-md px-2 pt-1">
                <Mark className="text-primary" />
                <span className="font-display text-lg leading-none">timbuktu</span>
                <span className="text-sm text-muted-foreground">{title}</span>
            </Link>
            <nav aria-label={title}>
                <NavList items={items} url={url} />
            </nav>
            <div className="mt-auto space-y-4">
                <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/">
                        <ArrowTopRightOnSquareIcon />
                        Open the fan app
                    </Link>
                </Button>
                <Identity area={area} />
            </div>
        </div>
    );

    return (
        <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr]">
            <a href="#main" className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
                Skip to content
            </a>
            <aside className="sticky top-0 hidden h-dvh border-r bg-card md:block">{sidebar}</aside>
            <div className="min-w-0">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur-sm md:px-8">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Open menu">
                                <Bars3Icon className="size-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72 p-0">
                            <SheetHeader className="sr-only">
                                <SheetTitle>{title} menu</SheetTitle>
                                <SheetDescription>Pages in the {title.toLowerCase()}</SheetDescription>
                            </SheetHeader>
                            {sidebar}
                        </SheetContent>
                    </Sheet>
                    <span className="font-display text-base md:hidden">timbuktu</span>
                    <div className="ml-auto">
                        <ModeSwitcher />
                    </div>
                </header>
                <main id="main" className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8">
                    {children}
                </main>
            </div>
            <DemoControls />
        </div>
    );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
                <h1 className="font-display text-2xl md:text-3xl">{title}</h1>
                {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
    );
}
