import type { VisibilityLevel } from "@/lib/types/db";

export type ViewerContext = {
  viewerId: string | null; // auth.uid() — null if not logged in
  isPromoter: boolean;
  isOwner: boolean; // viewerId === profileOwnerId
};

export function canViewBlock(blockVisibility: VisibilityLevel, viewer: ViewerContext): boolean {
  if (viewer.isOwner) return true;
  if (blockVisibility === "privado") return false;
  if (blockVisibility === "publico") return true;
  // "promotores"
  return viewer.isPromoter;
}
