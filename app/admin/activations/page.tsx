import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminActivations } from "@/components/admin/admin-activations";

export const metadata: Metadata = { title: "Activations" };

export default function Page() {
  return (
    <Suspense>
      <AdminActivations />
    </Suspense>
  );
}
