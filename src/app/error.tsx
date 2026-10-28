"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <p className="text-5xl" aria-hidden>
        ⚠
      </p>
      <h1 className="text-xl font-bold mt-3">Something went wrong</h1>
      <p className="text-muted mt-1 max-w-sm">We could not load this page. Please try again.{error.digest && ` (ref ${error.digest})`}</p>
      <button onClick={reset} className="mt-6 h-11 px-6 rounded-full bg-indigo-600 text-white font-medium">
        Try again
      </button>
    </main>
  );
}
