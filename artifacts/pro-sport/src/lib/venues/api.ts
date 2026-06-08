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
    .insert({ ...input, created_by: userId })
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { data: data as Venue, error: null };
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
