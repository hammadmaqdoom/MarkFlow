"use client";

import { Breadcrumb } from "@/components/app/Breadcrumb";
import { QuickSwitcher, useQuickSwitcher } from "@/components/app/QuickSwitcher";
import { createClient } from "@/lib/supabase/client";
import { useHeaderContent } from "@/contexts/HeaderContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { trpc } from "@/trpc/client";

const EDITOR_PREFERENCE_KEY = "markflow-editor-preference";
type EditorMode = "wysiwyg" | "markdown" | "split";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { open: quickSwitcherOpen, setOpen: setQuickSwitcherOpen } = useQuickSwitcher();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const utils = trpc.useUtils();
  const { data: me } = trpc.user.me.useQuery();
  const profile = me?.profile;
  const authUser = me?.user;
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => utils.user.me.invalidate(),
  });
  const editorPref = (profile?.editor_preference as EditorMode) ?? "wysiwyg";

  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    root.classList.toggle("dark");
    setDark(root.classList.contains("dark"));
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const setEditorPreference = useCallback(
    (mode: EditorMode) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(EDITOR_PREFERENCE_KEY, mode);
      }
      updateProfile.mutate({ editor_preference: mode });
      setUserMenuOpen(false);
    },
    [updateProfile]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4">
          <Link
            href="/dashboard"
            className="font-semibold text-text hover:text-text/90 shrink-0"
          >
            MarkFlow
          </Link>
          <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
          <div className="flex-1 min-w-0">
            {useHeaderContent() ?? <Breadcrumb />}
          </div>
          <div className="h-6 w-px shrink-0 bg-border" aria-hidden />
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full p-1 hover:bg-bg focus:outline-none focus:ring-2 focus:ring-accent"
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar URL is dynamic
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
                  {(profile?.full_name ?? authUser?.email ?? "?")[0]}
                </span>
              )}
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-surface py-1 shadow-lg"
                  role="menu"
                >
                  <div className="border-b border-border px-3 py-2 text-sm text-text-muted">
                    {profile?.full_name ?? authUser?.email}
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-3 py-2 text-sm text-text hover:bg-bg"
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="border-b border-border px-3 py-2">
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      Default editor
                    </span>
                    <div className="mt-1 flex gap-1">
                      {(["wysiwyg", "markdown", "split"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEditorPreference(m)}
                          className={`rounded px-2 py-1 text-xs capitalize ${
                            editorPref === m
                              ? "bg-accent text-white"
                              : "bg-bg text-text-muted hover:text-text"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-text hover:bg-bg"
                    role="menuitem"
                    onClick={() => {
                      toggleTheme();
                      setUserMenuOpen(false);
                    }}
                  >
                    {dark ? "☀️ Light" : "🌙 Dark"}
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-text hover:bg-bg"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-bg">{children}</main>
      </div>
      <QuickSwitcher open={quickSwitcherOpen} onClose={() => setQuickSwitcherOpen(false)} />
    </div>
  );
}
