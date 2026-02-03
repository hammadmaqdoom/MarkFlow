import { AppShell } from "@/components/app/AppShell";
import { HeaderProvider } from "@/contexts/HeaderContext";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderProvider>
      <AppShell>{children}</AppShell>
    </HeaderProvider>
  );
}
