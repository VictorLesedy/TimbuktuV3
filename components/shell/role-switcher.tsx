"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, Segmented, Switch } from "@/components/ui/controls";
import { Label } from "@/components/ui/field";
import { useMe } from "@/lib/queries";
import { resetDemoData, setDemoFanLevel } from "@/lib/repo";
import type { FanLevel, Role } from "@/lib/schemas";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

const HOME: Record<Role, string> = { fan: "/", entertainer: "/studio", admin: "/admin" };

export function RoleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { role, setRole, signedIn, setSignedIn, flakyNetwork, setFlakyNetwork } = useAppStore();
  const me = useMe();
  const [open, setOpen] = React.useState(false);

  const surface: Role = pathname.startsWith("/studio") ? "entertainer" : pathname.startsWith("/admin") ? "admin" : "fan";
  React.useEffect(() => {
    if (surface !== role) setRole(surface);
  }, [surface, role, setRole]);

  const level: FanLevel = signedIn ? (me.data?.progress.level ?? "member") : "explorer";
  const onFanPage = surface === "fan" && !pathname.startsWith("/onboarding") && !pathname.startsWith("/checkout");

  async function changeLevel(next: FanLevel) {
    setSignedIn(next !== "explorer");
    await setDemoFanLevel(next);
    await qc.invalidateQueries();
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-40 md:right-6 md:bottom-6",
        onFanPage ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" : "bottom-4",
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-raised/95 pr-4 pl-3 text-sm font-medium text-ink shadow-[0_8px_24px_var(--color-shadow)] backdrop-blur hover:border-muted"
          >
            <SlidersHorizontal className="size-4 text-accent" aria-hidden="true" />
            <span className="hidden sm:inline">{t.roleSwitcher.trigger}:</span>
            <span>{t.roleSwitcher.roles[surface]}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-5">
          <p className="font-semibold">{t.roleSwitcher.title}</p>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">{t.roleSwitcher.viewAs}</span>
            <Segmented<Role>
              label={t.roleSwitcher.viewAs}
              value={surface}
              onChange={(r) => {
                setRole(r);
                setOpen(false);
                router.push(HOME[r]);
              }}
              options={(["fan", "entertainer", "admin"] as const).map((r) => ({ value: r, label: t.roleSwitcher.roles[r] }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">{t.roleSwitcher.fanLevel}</span>
            <Segmented<FanLevel>
              label={t.roleSwitcher.fanLevel}
              value={level}
              onChange={(l) => void changeLevel(l)}
              options={(["explorer", "member", "ambassador"] as const).map((l) => ({ value: l, label: t.roleSwitcher.levels[l] }))}
            />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="flaky">{t.roleSwitcher.flaky}</Label>
              <p className="text-xs text-muted">{t.roleSwitcher.flakyHint}</p>
            </div>
            <Switch id="flaky" checked={flakyNetwork} onCheckedChange={setFlakyNetwork} />
          </div>
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                resetDemoData();
                useAppStore.setState({ signedIn: true, cart: null, referralCode: null });
                await qc.resetQueries();
                toast.success(t.roleSwitcher.resetDone);
                setOpen(false);
              }}
            >
              {t.roleSwitcher.reset}
            </Button>
            <p className="text-xs text-muted">{t.roleSwitcher.note}</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
