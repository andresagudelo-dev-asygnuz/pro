import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { getProfile, requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const profile = await getProfile();

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppNav profile={profile} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
