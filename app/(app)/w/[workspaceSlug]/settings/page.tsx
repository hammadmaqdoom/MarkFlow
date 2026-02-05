"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;

  useEffect(() => {
    router.replace(`/w/${workspaceSlug}/settings/members`);
  }, [workspaceSlug, router]);

  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}
