import * as React from "react";

export const THEMES = ["sunrise", "sunset", "moonlight"] as const;
export type ThemeName = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeName = "sunrise";

const KEY = "timbuktu-theme";
const EVENT = "timbuktu-theme-change";

/** Browser bar colour for each theme. Matches --tb-canvas in globals.css. */
export const THEME_CANVAS: Record<ThemeName, string> = {
  sunrise: "#F7F9FC",
  sunset: "#FFF3E8",
  moonlight: "#0B1322",
};

/** Home hero photo per theme. Keep in sync with --tb-art in globals.css. */
export const THEME_ART: Record<ThemeName, string> = {
  sunrise: "/hero/sunrise.webp",
  sunset: "/hero/sunset.webp",
  moonlight: "/hero/moonlight.webp",
};

const isTheme = (v: unknown): v is ThemeName => THEMES.includes(v as ThemeName);

/**
 * Runs in <head> before first paint so the saved theme never flashes.
 * Kept as a plain string: it cannot import anything.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(KEY)});if(${JSON.stringify(THEMES)}.indexOf(t)<0)t=${JSON.stringify(DEFAULT_THEME)};document.documentElement.dataset.theme=t;var c=${JSON.stringify(THEME_CANVAS)}[t];var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c);if(location.pathname==="/"){var l=document.createElement("link");l.rel="preload";l.as="image";l.href=${JSON.stringify(THEME_ART)}[t];l.setAttribute("fetchpriority","high");document.head.appendChild(l);}}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();`;

function read(): ThemeName {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const t = document.documentElement.dataset.theme;
  return isTheme(t) ? t : DEFAULT_THEME;
}

export function setTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_CANVAS[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the choice lasts for this visit */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useTheme(): ThemeName {
  return React.useSyncExternalStore(subscribe, read, () => DEFAULT_THEME);
}

/** Resolved colour values, for libraries that need real colours (charts). */
export function useThemeColors<K extends string>(names: readonly K[]): Record<K, string> {
  const theme = useTheme();
  const key = names.join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: recompute when the theme or the requested names change
  return React.useMemo(() => {
    const out = {} as Record<K, string>;
    const style = typeof window === "undefined" ? null : getComputedStyle(document.documentElement);
    for (const n of names) out[n] = style?.getPropertyValue(`--tb-${n}`).trim() || "currentColor";
    return out;
  }, [theme, key]);
}
