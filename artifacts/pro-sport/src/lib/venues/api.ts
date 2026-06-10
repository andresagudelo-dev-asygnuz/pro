import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Venue } from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };

export type VenueInput = {
  name: string;
  address: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  description?: string;
  phone?: string;
};

export async function getAllVenues(
  supabase: SupabaseClient,
): Promise<ApiResult<Venue[]>> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("name")
    .limit(200);
  if (error) return { error: mapDbError(error), data: null };
  return { data: (data ?? []) as Venue[], error: null };
}

export async function getVenuesByCity(
  supabase: SupabaseClient,
  city: string,
): Promise<ApiResult<Venue[]>> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .ilike("city", `%${city}%`)
    .order("name");
  if (error) return { error: mapDbError(error), data: null };
  return { data: (data ?? []) as Venue[], error: null };
}

export async function searchVenues(
  supabase: SupabaseClient,
  city: string,
  query: string,
): Promise<ApiResult<Venue[]>> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .ilike("city", `%${city}%`)
    .ilike("name", `%${query}%`)
    .order("name");
  if (error) return { error: mapDbError(error), data: null };
  return { data: (data ?? []) as Venue[], error: null };
}

export async function createVenue(
  supabase: SupabaseClient,
  input: VenueInput,
  userId: string,
): Promise<ApiResult<Venue>> {
  const { data, error } = await supabase
    .from("venues")
    .insert({ ...input, created_by: userId, owner_id: userId })
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { data: data as Venue, error: null };
}

export type VenueCourt = { id: string; venue_id: string; name: string; capacity_players: number };
export type VenueWithCourts = Venue & { venue_courts: VenueCourt[] };

export async function getOwnerVenuesWithCourts(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<VenueWithCourts[]>> {
  const { data, error } = await supabase
    .from("venues")
    .select("*, venue_courts(*)")
    .eq("owner_id", userId)
    .order("name");
  if (error) return { error: mapDbError(error), data: null };
  return { data: (data ?? []) as unknown as VenueWithCourts[], error: null };
}

export async function addVenueCourt(
  supabase: SupabaseClient,
  venueId: string,
  input: { name: string; capacity_players: number },
): Promise<ApiResult<VenueCourt>> {
  const { data, error } = await supabase
    .from("venue_courts")
    .insert({ venue_id: venueId, ...input })
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { data: data as VenueCourt, error: null };
}

export async function getVenueById(
  supabase: SupabaseClient,
  id: string,
): Promise<ApiResult<Venue>> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { data: data as Venue, error: null };
}

export type VenueUpdateInput = Partial<VenueInput & {
  whatsapp: string;
  banner_url: string;
  logo_url: string;
  owner_id: string;
  payment_instructions: string | null;
  payment_methods: any[];
}>;

export async function getVenueByOwner(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<Venue | null>> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) return { error: mapDbError(error), data: null };
  return { data: data as Venue | null, error: null };
}

export async function updateVenue(
  supabase: SupabaseClient,
  id: string,
  input: VenueUpdateInput,
): Promise<ApiResult<Venue>> {
  const { data, error } = await supabase
    .from("venues")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { data: data as Venue, error: null };
}

export async function upsertOwnerVenue(
  supabase: SupabaseClient,
  userId: string,
  input: VenueInput & { whatsapp?: string },
): Promise<ApiResult<Venue>> {
  // Check if owner already has a venue
  const existing = await getVenueByOwner(supabase, userId);
  if (existing.data) {
    return updateVenue(supabase, existing.data.id, input);
  }
  return createVenue(supabase, input, userId);
}

export async function uploadVenueAsset(
  supabase: SupabaseClient,
  venueId: string,
  type: "banner" | "logo" | string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${venueId}/${type}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("venues").upload(path, file, { upsert: true });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from("venues").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
