"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="container section">
      <div className="empty">
        <h1>Let’s try that again</h1>
        <p className="muted">
          The store could not load this page. Please try again in a moment.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </section>
  );
}
