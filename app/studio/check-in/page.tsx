import type { Metadata } from "next";
import { CheckIn } from "@/components/studio/check-in";

export const metadata: Metadata = { title: "Door check-in" };

export default function Page() {
  return <CheckIn />;
}
