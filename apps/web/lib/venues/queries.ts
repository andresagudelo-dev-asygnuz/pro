import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getVenuesWithCourts = cache(async () => {
    const supabase = await createClient();
    const { data } = await supabase
        .from("venues")
        .select("*, venue_courts(*)")
        .eq("is_active", true)
        .order("name");
    return data || [];
});
