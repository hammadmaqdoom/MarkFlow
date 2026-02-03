"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-medium text-text">Something went wrong</h2>
      <p className="text-sm text-text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded bg-accent px-4 py-2 text-sm text-white hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
