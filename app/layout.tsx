import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/shell/providers";
import { RoleSwitcher } from "@/components/shell/role-switcher";
import { DEFAULT_THEME, THEME_CANVAS, themeBootScript } from "@/lib/theme";
import { t } from "@/messages/en";
import "./globals.css";

const anton = localFont({ src: "./fonts/anton.woff2", variable: "--font-anton", display: "swap", weight: "400" });
const grotesk = localFont({ src: "./fonts/space-grotesk.woff2", variable: "--font-grotesk", display: "swap", weight: "300 700" });

export const metadata: Metadata = {
  title: { default: `${t.brand.name}: ${t.brand.tagline}`, template: `%s | ${t.brand.name}` },
  description: "Concerts, match days, festivals, days out and talent to hire across Tanzania. See what is on, then book in a few taps.",
  applicationName: t.brand.name,
};

export const viewport: Viewport = {
  themeColor: THEME_CANVAS[DEFAULT_THEME],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script sets data-theme before paint, so the server value may differ.
    <html lang="en" data-theme={DEFAULT_THEME} className={`${anton.variable} ${grotesk.variable}`} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static theme script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-accent px-4 py-2 text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t.brand.skip}
        </a>
        <Providers>
          {children}
          <RoleSwitcher />
        </Providers>
      </body>
    </html>
  );
}
