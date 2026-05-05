import { AppNav } from "@/components/AppNav";
import { BottomNav } from "@/components/BottomNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
