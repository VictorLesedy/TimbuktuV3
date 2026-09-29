import type { Metadata } from "next";
import { StudioPayouts } from "@/components/studio/studio-payouts";

export const metadata: Metadata = { title: "Payouts" };

export default function Page() {
  return <StudioPayouts />;
}
