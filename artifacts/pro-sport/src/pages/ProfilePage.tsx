import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getMyTeams, type TeamWithCount } from "@/lib/teams/api";
import { updateUserRole } from "@/lib/roles/api";
import { uploadFile } from "@/lib/storage/api";
import { updateProfileFields } from "@/lib/profiles/api";
import { getUserVerification } from "@/lib/verifications/api";
import { toast } from "sonner";
import type { AgeVerificationStatus } from "@/lib/types/db";
import { useProfileBlocks } from "@/hooks/useProfileBlocks";
import { ProfileSkeleton } from "@/components/ui/skeletons";
import { resizeToDataUrl } from "@/lib/image-utils";
import { CanchaOwnerProfileView } from "@/components/profile/CanchaOwnerProfileView";
import { PlayerProfileView } from "@/components/profile/PlayerProfileView";

export default function ProfilePage() {
  const { user, profile, roles, loading, signOut, refreshRoles, updateProfile } = useAuth();
  const [, setLocation] = useLocation();

  const [upgradingPromoter, setUpgradingPromoter] = useState(false);
  const [upgradingCancha,   setUpgradingCancha]   = useState(false);
  const [uploadingAvatar,   setUploadingAvatar]   = useState(false);
  const [myTeams,     setMyTeams]     = useState<TeamWithCount[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<AgeVerificationStatus | null>(null);

  const { blocks } = useProfileBlocks(user?.id ?? "");

  useEffect(() => {
    if (!user) return;
    getMyTeams(user.id)
      .then(setMyTeams)
      .catch(() => {})
      .finally(() => setTeamsLoaded(true));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getUserVerification(supabase, user.id).then(({ data }) => {
      if (!data) return;
      setVerificationStatus(data.status);
      if (data.status === "pendiente") {
        toast.info("Tu verificación de edad está en revisión.", {
          description: "Te avisamos cuando se resuelva.",
          action: { label: "Ver estado", onClick: () => setLocation("/verificacion") },
          duration: 8000,
        });
      } else if (data.status === "rechazada") {
        toast.warning("Tu verificación fue rechazada.", {
          description: data.rejection_reason ?? "Subí un nuevo documento con la fecha de nacimiento legible.",
          action: { label: "Reintentar", onClick: () => setLocation("/verificacion") },
          duration: 8000,
        });
      }
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  async function handleEnablePromoter() {
    if (!user) return;
    setUpgradingPromoter(true);
    const { error } = await updateUserRole(supabase, user.id, { is_promoter: true });
    if (error) {
      toast.error("No se pudo activar el rol.");
    } else {
      await refreshRoles();
      toast.success("¡Rol de Promotor activado! Crea tu primer torneo.", {
        action: { label: "Crear torneo", onClick: () => setLocation("/tournaments/new") },
        duration: 6000,
      });
      setLocation("/tournaments/new");
    }
    setUpgradingPromoter(false);
  }

  async function handleEnableCancha() {
    if (!user) return;
    setUpgradingCancha(true);
    const { error } = await updateUserRole(supabase, user.id, { is_cancha: true });
    if (error) toast.error("No se pudo activar el rol.");
    else { toast.success("¡Rol de Cancha activado!"); await refreshRoles(); }
    setUpgradingCancha(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("La imagen no puede superar 10 MB."); return; }

    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 512, 0.88);
      
      // Convert Data URL to Blob for upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { url: publicUrl, error: uploadError } = await uploadFile(supabase, "avatars", fileName, blob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw new Error(uploadError);
      if (!publicUrl) throw new Error("No se obtuvo la URL pública.");

      updateProfile({ avatar_url: publicUrl });
      const { error } = await updateProfileFields(supabase, user.id, { avatar_url: publicUrl });
      if (error) throw new Error(error);
      toast.success("¡Foto actualizada!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error("Error al guardar la foto: " + msg);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-24">
        <ProfileSkeleton />
      </div>
    );
  }

  if (roles?.is_cancha) {
    return (
      <CanchaOwnerProfileView
        profile={profile}
        user={user!}
        roles={roles}
        uploadingAvatar={uploadingAvatar}
        onAvatarChange={handleAvatarUpload}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <PlayerProfileView
      profile={profile}
      user={user!}
      roles={roles}
      teams={myTeams}
      teamsLoaded={teamsLoaded}
      blocks={blocks}
      uploadingAvatar={uploadingAvatar}
      upgradingPromoter={upgradingPromoter}
      upgradingCancha={upgradingCancha}
      onAvatarChange={handleAvatarUpload}
      onSignOut={handleSignOut}
      onEnablePromoter={handleEnablePromoter}
      onEnableCancha={handleEnableCancha}
    />
  );
}
