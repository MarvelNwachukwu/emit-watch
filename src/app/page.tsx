import { Suspense } from "react";
import { EventApp } from "@/components/EventApp";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export default function Home() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EventApp />
    </Suspense>
  );
}
