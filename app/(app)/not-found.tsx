import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold text-text">404</h1>
      <p className="text-text-muted">This page could not be found.</p>
      <Link
        href="/dashboard"
        className="text-accent hover:underline"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
