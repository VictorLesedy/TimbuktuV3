import type { Metadata } from "next";
import { OnboardingView } from "@/components/fan/onboarding-view";

export const metadata: Metadata = { title: "Join" };

export default function OnboardingPage() {
  return (
    <main id="main">
      <OnboardingView />
    </main>
  );
}
