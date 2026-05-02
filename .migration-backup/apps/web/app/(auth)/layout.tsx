import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 p-6">
      <Link
        href="/"
        className="text-xl font-semibold tracking-tight text-foreground"
      >
        PRO
      </Link>
      <main className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        {children}
      </main>
    </div>
  );
}
