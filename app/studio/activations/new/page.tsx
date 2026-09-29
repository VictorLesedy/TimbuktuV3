import type { Metadata } from "next";
import { Wizard } from "@/components/studio/wizard";

export const metadata: Metadata = { title: "New activation" };

export default function NewActivationPage() {
  return <Wizard />;
}
