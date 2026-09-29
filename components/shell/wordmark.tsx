import Link from "next/link";
import { cn } from "@/lib/utils";
import { t } from "@/messages/en";

export function Wordmark({ className, href = "/", suffix }: { className?: string; href?: string; suffix?: string }) {
  return (
    <Link href={href} className={cn("flex items-baseline gap-2 rounded-md", className)}>
      <span className="font-display text-2xl leading-none text-ink">{t.brand.name.toLowerCase()}</span>
      {suffix ? <span className="text-sm text-muted">{suffix}</span> : null}
    </Link>
  );
}
