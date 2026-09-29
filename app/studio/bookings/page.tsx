import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioBookings } from "@/components/studio/studio-bookings";

export const metadata: Metadata = { title: "Bookings" };

export default function Page() {
  return (
    <Suspense>
      <StudioBookings />
    </Suspense>
  );
}
