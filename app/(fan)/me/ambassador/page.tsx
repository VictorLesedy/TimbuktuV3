import type { Metadata } from "next";
import { AmbassadorView } from "@/components/fan/ambassador-view";

export const metadata: Metadata = { title: "Ambassador" };

export default function AmbassadorPage() {
  return <AmbassadorView />;
}
