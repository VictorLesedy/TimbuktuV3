import type { Metadata } from "next";
import { StudioActivations } from "@/components/studio/studio-activations";

export const metadata: Metadata = { title: "Activations" };

export default function Page() {
  return <StudioActivations />;
}
