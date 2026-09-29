import type { Metadata } from "next";
import { Approvals } from "@/components/admin/approvals";

export const metadata: Metadata = { title: "Approvals" };

export default function Page() {
  return <Approvals />;
}
