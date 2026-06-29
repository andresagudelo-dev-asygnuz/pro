import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { PlayerShell } from "@/components/layouts/PlayerShell";
import { OwnerShell } from "@/components/layouts/OwnerShell";

type RequireRole = "is_cancha" | "is_promoter" | "is_admin";

interface ProtectedRouteProps {
  component: React.ComponentType;
  requireRole?: RequireRole;
  layout?: "player" | "owner" | "none";
}

export function ProtectedRoute({ component: Component, requireRole, layout = "none" }: ProtectedRouteProps) {
  const { user, profile, roles, loading, profileLoading, rolesLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const isFullyLoaded = !loading && !profileLoading && !rolesLoading;

  useEffect(() => {
    if (!isFullyLoaded) return;
    if (!user) { setLocation("/login"); return; }
    
    // Si el usuario es jugador y no ha completado el perfil, forzamos onboarding
    const isPlayer = roles?.is_player;
    const needsOnboarding = isPlayer && (!profile || !profile.full_name);
    
    if (needsOnboarding && location !== "/onboarding" && location !== "/perfil/editar") {
      setLocation("/onboarding");
      return;
    }

    if (requireRole && roles && !roles[requireRole]) {
      // Redirect to the appropriate home for their actual role
      setLocation(roles.is_cancha ? "/mis-canchas/dashboard" : "/feed");
      return;
    }
  }, [user, roles, profile, isFullyLoaded, requireRole, location, setLocation]);

  if (!isFullyLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;
  
  // Evitar que se renderice el componente si va a ser redirigido a onboarding
  const isPlayer = roles?.is_player;
  const needsOnboarding = isPlayer && (!profile || !profile.full_name);
  if (needsOnboarding && location !== "/onboarding" && location !== "/perfil/editar") return null;

  if (requireRole && roles && !roles[requireRole]) return null;

  if (layout === "player") return <PlayerShell><Component /></PlayerShell>;
  if (layout === "owner") return <OwnerShell><Component /></OwnerShell>;
  return <Component />;
}
