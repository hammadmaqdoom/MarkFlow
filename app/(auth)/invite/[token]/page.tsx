"use client";

import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/trpc/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "auth">("loading");
  const ran = useRef(false);
  const acceptInvite = trpc.workspace.acceptInviteLink.useMutation({
    onSuccess: (data) => {
      setStatus("ok");
      router.replace(`/w/${data.workspaceSlug}`);
    },
    onError: (err) => {
      if (err.data?.code === "UNAUTHORIZED") {
        setStatus("auth");
        return;
      }
      setStatus("error");
    },
  });

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setStatus("auth");
        router.replace(`/login?redirectTo=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }
      acceptInvite.mutate({ token });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount when token is set
  }, [token]);

  if (status === "loading" || status === "auth") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-lg font-medium text-text">Invalid or expired invite</h2>
        <p className="text-sm text-text-muted">This invite link may have expired or already been used.</p>
        <a href="/dashboard" className="text-accent hover:underline">
          Go to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
