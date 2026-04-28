"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth/with-auth";

export async function createVenue(formData: FormData) {
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const address = formData.get("address") as string;

    return withAuth(async ({ supabase }) => {
        const { error } = await supabase.from("venues").insert({
            name,
            city,
            address,
        });

        if (error) throw error;
        revalidatePath("/admin/venues");
    });
}

export async function createCourt(venueId: string, formData: FormData) {
    const name = formData.get("name") as string;
    const capacity = parseInt(formData.get("capacity") as string);

    return withAuth(async ({ supabase }) => {
        const { error } = await supabase.from("venue_courts").insert({
            venue_id: venueId,
            name,
            capacity_players: capacity,
        });

        if (error) throw error;
        revalidatePath("/admin/venues");
    });
}
