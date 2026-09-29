"use client";

import { CircleUser, Compass, Heart, House } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CITIES } from "@/lib/config";
import type { City } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";
import { ThemeMenu, ThemeSwitcher } from "./theme-switcher";
import { Wordmark } from "./wordmark";

const LINKS = [
  { href: "/", label: t.nav.home, icon: House, match: (p: string) => p === "/" },
  { href: "/explore", label: t.nav.explore, icon: Compass, match: (p: string) => p.startsWith("/explore") || p.startsWith("/a/") },
  { href: "/me?tab=saved", label: t.nav.saved, icon: Heart, match: (p: string, tab: string | null) => p === "/me" && tab === "saved" },
  { href: "/me", label: t.nav.me, icon: CircleUser, match: (p: string, tab: string | null) => p.startsWith("/me") && tab !== "saved" },
] as const;

export function FanHeader() {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const { city, setCity, signedIn } = useAppStore();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-5 md:px-8">
        <Wordmark />
        <nav aria-label={t.nav.main} className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = l.match(pathname, tab);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "bg-tint/[0.08] text-ink" : "text-muted hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeSwitcher className="hidden lg:flex" />
          <ThemeMenu className="lg:hidden" />
          <label className="sr-only" htmlFor="city-select">
            {t.nav.yourCity}
          </label>
          <select
            id="city-select"
            value={city}
            onChange={(e) => setCity(e.target.value as City)}
            className="h-9 max-w-[9.5rem] cursor-pointer appearance-none truncate rounded-full border border-line bg-transparent px-3 text-sm text-ink hover:border-line-strong"
          >
            {CITIES.map((c) => (
              <option key={c} value={c} className="bg-surface">
                {c}
              </option>
            ))}
          </select>
          {!signedIn ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/onboarding">{t.nav.signUp}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  if (pathname.startsWith("/checkout") || pathname.startsWith("/onboarding")) return null;
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {LINKS.map((l) => {
          const active = l.match(pathname, tab);
          const Icon = l.icon;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
