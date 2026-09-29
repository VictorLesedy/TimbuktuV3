"use client";

import { CalendarCheck, Layers, LayoutDashboard, ScanLine, Wallet } from "lucide-react";
import { ConsoleShell } from "@/components/shell/console-shell";
import { useIncomingHire } from "@/lib/queries";
import { t } from "@/messages/en";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const hire = useIncomingHire();
  const open = hire.data?.filter((h) => h.status === "sent").length ?? 0;
  return (
    <ConsoleShell
      title={t.studio.title}
      home="/studio"
      links={[
        { href: "/studio", label: t.studio.nav.overview, icon: LayoutDashboard, exact: true },
        { href: "/studio/activations", label: t.studio.nav.activations, icon: Layers },
        { href: "/studio/bookings", label: t.studio.nav.bookings, icon: CalendarCheck, badge: open },
        { href: "/studio/check-in", label: t.studio.nav.checkin, icon: ScanLine },
        { href: "/studio/payouts", label: t.studio.nav.payouts, icon: Wallet },
      ]}
    >
      {children}
    </ConsoleShell>
  );
}
