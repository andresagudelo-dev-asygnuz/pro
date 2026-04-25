import type { ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { AgeVerificationBanner } from "@/components/age-verification-banner";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAdminUser } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { getMyVenuesCount } from "@/lib/venues/queries";
import { getUserRoles } from "@/lib/auth/roles";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, admin, unreadRes, venuesCount, roles] = await Promise.all([
    getProfile(),
    getAdminUser(),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    getMyVenuesCount(),
    getUserRoles(),
  ]);

  const unreadCount = unreadRes.count || 0;
  const isVenueOwner = venuesCount > 0 || (roles?.is_promoter ?? false);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppNav
        profile={profile}
        isAdmin={Boolean(admin)}
        isPromoter={isVenueOwner}
        unreadNotifications={unreadCount}
      />
      <AgeVerificationBanner />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
