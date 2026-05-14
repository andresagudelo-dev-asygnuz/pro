import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type {
  ProfileMorpho,
  ProfileConditional,
  ProfileTechnicalFootball,
  VisibilityLevel,
} from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };

type ProfileBlocks = {
  morpho: ProfileMorpho | null;
  conditional: ProfileConditional | null;
  technical: ProfileTechnicalFootball | null;
};

export async function getProfileBlocks(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<ProfileBlocks>> {
  const [morphoRes, conditionalRes, technicalRes] = await Promise.all([
    supabase.from("profile_morpho").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_conditional").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profile_technical_football")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (morphoRes.error) return { data: null, error: mapDbError(morphoRes.error, "getProfileBlocks:morpho") };
  if (conditionalRes.error) return { data: null, error: mapDbError(conditionalRes.error, "getProfileBlocks:conditional") };
  if (technicalRes.error) return { data: null, error: mapDbError(technicalRes.error, "getProfileBlocks:technical") };

  return {
    data: {
      morpho: (morphoRes.data as ProfileMorpho | null),
      conditional: (conditionalRes.data as ProfileConditional | null),
      technical: (technicalRes.data as ProfileTechnicalFootball | null),
    },
    error: null,
  };
}

export type MorphoInput = Partial<Omit<ProfileMorpho, "user_id" | "created_at" | "updated_at">>;

export async function updateMorpho(
  supabase: SupabaseClient,
  userId: string,
  data: MorphoInput,
): Promise<ApiResult<ProfileMorpho>> {
  const { data: result, error } = await supabase
    .from("profile_morpho")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "updateMorpho") };
  return { data: result as ProfileMorpho, error: null };
}

export type ConditionalInput = Partial<Omit<ProfileConditional, "user_id" | "created_at" | "updated_at">>;

export async function updateConditional(
  supabase: SupabaseClient,
  userId: string,
  data: ConditionalInput,
): Promise<ApiResult<ProfileConditional>> {
  const { data: result, error } = await supabase
    .from("profile_conditional")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "updateConditional") };
  return { data: result as ProfileConditional, error: null };
}

export type TechnicalInput = Partial<Omit<ProfileTechnicalFootball, "user_id" | "created_at" | "updated_at">>;

export async function updateTechnicalFootball(
  supabase: SupabaseClient,
  userId: string,
  data: TechnicalInput,
): Promise<ApiResult<ProfileTechnicalFootball>> {
  const { data: result, error } = await supabase
    .from("profile_technical_football")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "updateTechnicalFootball") };
  return { data: result as ProfileTechnicalFootball, error: null };
}

const BLOCK_TABLE = {
  morpho: "profile_morpho",
  conditional: "profile_conditional",
  technical_football: "profile_technical_football",
} as const;

export async function updateVisibility(
  supabase: SupabaseClient,
  userId: string,
  block: "morpho" | "conditional" | "technical_football",
  level: VisibilityLevel,
): Promise<ApiResult<null>> {
  const table = BLOCK_TABLE[block];
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId, visibility: level }, { onConflict: "user_id" });
  if (error) return { data: null, error: mapDbError(error, `updateVisibility:${block}`) };
  return { data: null, error: null };
}
