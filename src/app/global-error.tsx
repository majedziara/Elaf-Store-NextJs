"use client";
export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            fontFamily: "Arial, sans-serif",
            padding: 40,
            maxWidth: 600,
            margin: "auto",
          }}
        >
          <h1>The store could not load.</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}
