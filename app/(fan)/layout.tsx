import { Suspense } from "react";
import { BottomNav, FanHeader } from "@/components/shell/fan-nav";

export default function FanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-line" />}>
        <FanHeader />
      </Suspense>
      <main id="main" className="pb-safe-nav md:pb-16">
        {children}
      </main>
      <Suspense>
        <BottomNav />
      </Suspense>
    </>
  );
}
