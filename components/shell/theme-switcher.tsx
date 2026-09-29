"use client";

import { Moon, Sunrise, Sunset } from "lucide-react";
import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/controls";
import { setTheme, THEMES, type ThemeName, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

const ICON = { sunrise: Sunrise, sunset: Sunset, moonlight: Moon } satisfies Record<ThemeName, unknown>;

/** Three-way theme picker. A radio group, so arrow keys move between options. */
export function ThemeSwitcher({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const theme = useTheme();
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = THEMES[(i + d + THEMES.length) % THEMES.length] ?? "sunrise";
    setTheme(next);
    refs.current[THEMES.indexOf(next)]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.theme.label}
      className={cn("flex items-center gap-0.5 rounded-full border border-line p-0.5", className)}
    >
      {THEMES.map((name, i) => {
        const Icon = ICON[name];
        const on = theme === name;
        return (
          <button
            key={name}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t.theme.names[name]}
            title={t.theme.names[name]}
            tabIndex={on ? 0 : -1}
            onClick={() => setTheme(name)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
              on ? "bg-ink text-canvas" : "text-muted hover:bg-tint/5 hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {showLabel ? <span>{t.theme.names[name]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Phones: one button showing the current theme, opening the full picker. */
export function ThemeMenu({ className }: { className?: string }) {
  const theme = useTheme();
  const Icon = ICON[theme];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t.theme.label}: ${t.theme.names[theme]}`}
          className={cn("grid size-9 place-items-center rounded-full border border-line text-ink hover:border-line-strong", className)}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <p className="mb-2 px-1 text-xs text-muted">{t.theme.label}</p>
        <ThemeSwitcher
          showLabel
          className="flex-col items-stretch rounded-2xl [&>button]:h-10 [&>button]:justify-start [&>button]:rounded-xl [&>button]:px-3 [&>button]:text-sm"
        />
      </PopoverContent>
    </Popover>
  );
}
