import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Layout para todas las rutas admin (`/admin/*`).
 *
 * Gatea por whitelist `ADMIN_EMAILS` vía `requireAdmin()`. Un no-admin
 * termina en `/feed` (sin 403/404 explícito — ver `requireAdmin` rationale).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Navegación admin"
        className="flex flex-wrap items-center gap-4 rounded-md border bg-background px-4 py-2 text-sm"
      >
        <span className="font-semibold text-foreground">Admin</span>
        <Link
          href="/admin/verificaciones"
          className="text-muted-foreground hover:text-foreground"
        >
          Verificaciones
        </Link>
      </nav>
      {children}
    </div>
  );
}
