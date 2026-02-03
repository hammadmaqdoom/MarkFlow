import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
          MarkFlow
        </h1>
        <p className="text-xl text-text-muted">
          The Founder&apos;s Growth Engine — real-time docs, dual-mode editing,
          and one-click export for AI.
        </p>
        <p className="text-base text-text-muted">
          Write in Markdown. Your co-founder edits in WYSIWYG. Same doc, live
          sync. Connect GitHub. Export for Claude.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-6 text-sm font-medium text-text hover:bg-bg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
