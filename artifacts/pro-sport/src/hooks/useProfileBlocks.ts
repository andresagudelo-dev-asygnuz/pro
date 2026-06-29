import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  getProfileBlocks,
  updateMorpho,
  updateConditional,
  updateTechnicalFootball,
  type MorphoInput,
  type ConditionalInput,
  type TechnicalInput,
} from "@/lib/profiles/api";
import type { VisibilityLevel } from "@/lib/types/db";

export function useProfileBlocks(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["profile-blocks", userId];

  const { data: blocks, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getProfileBlocks(supabase, userId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    enabled: Boolean(userId),
  });

  const morphoMutation = useMutation({
    mutationFn: (data: MorphoInput & { visibility: VisibilityLevel }) =>
      updateMorpho(supabase, userId, data),
    onSuccess: (result) => {
      if (result.error) toast.error(result.error);
      else queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const conditionalMutation = useMutation({
    mutationFn: (data: ConditionalInput & { visibility: VisibilityLevel }) =>
      updateConditional(supabase, userId, data),
    onSuccess: (result) => {
      if (result.error) toast.error(result.error);
      else queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const technicalMutation = useMutation({
    mutationFn: (data: TechnicalInput & { visibility: VisibilityLevel }) =>
      updateTechnicalFootball(supabase, userId, data),
    onSuccess: (result) => {
      if (result.error) toast.error(result.error);
      else queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isSaving =
    morphoMutation.isPending || conditionalMutation.isPending || technicalMutation.isPending;

  return {
    blocks,
    isLoading,
    updateMorpho: morphoMutation.mutateAsync,
    updateConditional: conditionalMutation.mutateAsync,
    updateTechnicalFootball: technicalMutation.mutateAsync,
    isSaving,
  };
}
