"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThinkleafApp } from "@/components/ThinkleafApp";

export default function Home() {
  return (
    <ErrorBoundary>
      <ThinkleafApp />
    </ErrorBoundary>
  );
}
