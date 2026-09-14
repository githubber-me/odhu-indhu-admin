"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="dashboard-error">
      <span><CircleAlert size={23} /></span>
      <p className="eyebrow">Something went quiet</p>
      <h1>The dashboard could not be loaded.</h1>
      <p>Your data is safe. Check the connection and try this view again.</p>
      <button onClick={reset}><RotateCcw size={16} /> Try again</button>
    </main>
  );
}
