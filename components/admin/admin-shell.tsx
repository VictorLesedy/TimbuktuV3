"use client";

import { BadgeCheck, Layers, LayoutDashboard, PieChart, Settings } from "lucide-react";
import { ConsoleShell } from "@/components/shell/console-shell";
import { useApprovals } from "@/lib/queries";
import { t } from "@/messages/en";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const approvals = useApprovals();
  return (
    <ConsoleShell
      title={t.admin.title}
      home="/admin"
      links={[
        { href: "/admin", label: t.admin.nav.overview, icon: LayoutDashboard, exact: true },
        { href: "/admin/approvals", label: t.admin.nav.approvals, icon: BadgeCheck, badge: approvals.data?.length },
        { href: "/admin/activations", label: t.admin.nav.activations, icon: Layers },
        { href: "/admin/revenue", label: t.admin.nav.revenue, icon: PieChart },
        { href: "/admin/settings", label: t.admin.nav.settings, icon: Settings },
      ]}
    >
      {children}
    </ConsoleShell>
  );
}
