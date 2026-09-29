import type { Metadata } from "next";
import { Suspense } from "react";
import { MeView } from "@/components/fan/me-view";

export const metadata: Metadata = { title: "Your profile" };

export default function MePage() {
  return (
    <Suspense>
      <MeView />
    </Suspense>
  );
}
