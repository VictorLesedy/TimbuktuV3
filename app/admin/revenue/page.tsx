import type { Metadata } from "next";
import { Suspense } from "react";
import { Revenue } from "@/components/admin/revenue";

export const metadata: Metadata = { title: "Revenue" };

export default function Page() {
  return (
    <Suspense>
      <Revenue />
    </Suspense>
  );
}
