"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";
import { ThemeMenu, ThemeSwitcher } from "./theme-switcher";
import { Wordmark } from "./wordmark";

export type ConsoleLink = { href: string; label: string; icon: LucideIcon; badge?: number; exact?: boolean };

function NavList({ links, onNavigate }: { links: ConsoleLink[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        const Icon = l.icon;
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                active ? "bg-tint/[0.07] text-ink" : "text-muted hover:bg-tint/[0.03] hover:text-ink",
              )}
            >
              <Icon className={cn("size-[18px]", active && "text-accent")} aria-hidden="true" />
              <span className="flex-1">{l.label}</span>
              {l.badge ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent tabular">{l.badge}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ConsoleShell({
  title,
  home,
  links,
  children,
}: {
  title: string;
  home: string;
  links: ConsoleLink[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line px-4 py-6 md:flex">
        <Wordmark href={home} suffix={title} className="px-3" />
        <nav aria-label={title}>
          <NavList links={links} />
        </nav>
        <ThemeSwitcher className="mt-auto self-start" />
        <Link href="/" className="flex items-center gap-2 px-3 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t.nav.backToApp}
        </Link>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/90 px-5 backdrop-blur-md md:hidden">
        <Wordmark href={home} suffix={title} />
        <div className="flex items-center gap-1">
          <ThemeMenu />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger aria-label={t.nav.openMenu} className="grid size-11 place-items-center rounded-full text-ink hover:bg-tint/5">
              <Menu className="size-5" />
            </DialogTrigger>
            <DialogContent side="left" title={title}>
              <nav aria-label={title} className="flex flex-col gap-8">
                <NavList links={links} onNavigate={() => setOpen(false)} />
                <Link href="/" className="flex items-center gap-2 px-3 text-sm text-muted hover:text-ink">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {t.nav.backToApp}
                </Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main id="main" className="min-w-0 px-5 pt-6 pb-24 md:px-10 md:pt-10">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-display-md text-ink">{title}</h1>
        {hint ? <p className="mt-2 text-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
