import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";

export const getVenuesWithCourts = cache(async () => {
    const supabase = await createClient();
    const { data } = await supabase
        .from("venues")
        .select("*, venue_courts(*)")
        .eq("is_active", true)
        .order("name");
    return data || [];
});

export const getMyVenuesCount = cache(async () => {
    const user = await getUser();
    if (!user) return 0;

    const supabase = await createClient();
    const { count } = await supabase
        .from("venues")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id);

    return count || 0;
});
