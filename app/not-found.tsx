import Link from "next/link";
import { Button } from "@/components/ui/button";
import { t } from "@/messages/en";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5">
      <p className="font-display text-display-xl text-accent">404</p>
      <h1 className="text-2xl font-semibold">{t.states.notFound}</h1>
      <p className="text-muted">{t.states.notFoundBody}</p>
      <Button asChild size="lg" className="self-start">
        <Link href="/">{t.states.goHome}</Link>
      </Button>
    </main>
  );
}
