"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth/with-auth";
import { mapDbError } from "@/lib/errors/map-db-error";

export async function createVenue(formData: FormData) {
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const address = formData.get("address") as string;

    return withAuth(async ({ user, supabase }) => {
        const { data, error } = await supabase.from("venues").insert({
            owner_id: user.id,
            name,
            city,
            address,
        }).select().single();

        if (error) return { error: mapDbError(error, "createVenue") };
        revalidatePath("/admin/venues");
        return { ok: true, data };
    });
}

export async function createCourt(venueId: string, formData: FormData) {
    const name = formData.get("name") as string;
    const capacity = parseInt(formData.get("capacity") as string);

    return withAuth(async ({ user, supabase }) => {
        const { error } = await supabase.from("venue_courts").insert({
            venue_id: venueId,
            name,
            capacity_players: capacity,
        });

        if (error) return { error: mapDbError(error, "createCourt") };
        revalidatePath("/admin/venues");
        return { ok: true };
    });
}
