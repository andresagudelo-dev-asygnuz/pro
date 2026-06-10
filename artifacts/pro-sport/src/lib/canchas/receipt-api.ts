import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyReceiptUploaded, notifyNewBooking, notifyBookingConfirmed, notifyPaymentRejected } from "@/lib/notifications/api";

export async function uploadBookingReceipt(
  supabase: SupabaseClient,
  bookingId: string,
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `bookings/${userId}/${bookingId}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, { upsert: true });

  if (uploadError) return { url: null, error: uploadError.message };

  // Bucket is private — use signed URL instead of public URL
  const { data: signedData, error: signedError } = await supabase.storage
    .from("receipts")
    .createSignedUrl(path, 60 * 60 * 24); // 24h

  if (signedError) return { url: null, error: signedError.message };

  // Update booking with receipt info
  const { error: dbError } = await supabase
    .from("cancha_bookings")
    .update({
      status: "en_validacion",
      receipt_url: path, // store path, not signed URL
      receipt_uploaded_at: new Date().toISOString(),
      expires_at: null,
    })
    .eq("id", bookingId);

  if (dbError) return { url: null, error: dbError.message };

  // Notify the owner
  const { data: bookingData } = await supabase
    .from("cancha_bookings")
    .select(`
      booking_date, start_time, end_time,
      canchas!inner(id, name, owner_id),
      profiles!cancha_bookings_booked_by_fkey(full_name)
    `)
    .eq("id", bookingId)
    .single();

  if (bookingData) {
    // @ts-ignore
    const ownerId = bookingData.canchas.owner_id;
    // @ts-ignore
    const canchaName = bookingData.canchas.name;
    // @ts-ignore
    const bookerName = bookingData.profiles?.full_name || "Usuario";

    await notifyReceiptUploaded(supabase, ownerId, {
      // @ts-ignore
      cancha_id: bookingData.canchas.id,
      cancha_name: canchaName,
      booking_date: bookingData.booking_date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      booker_name: bookerName,
    });
  }

  return { url: signedData.signedUrl, error: null };
}

export async function getReceiptSignedUrl(
  supabase: SupabaseClient,
  receiptPath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(receiptPath, 60 * 60); // 1h
  if (error) return null;
  return data.signedUrl;
}

export async function approveBookingReceipt(
  supabase: SupabaseClient,
  bookingId: string,
  paymentStatus: "anticipo_pagado" | "pagado_total",
  paidAmount: number
): Promise<{ error: string | null }> {
  const { data: booking } = await supabase
    .from("cancha_bookings")
    .select("*, canchas(name)")
    .eq("id", bookingId)
    .single();

  const { error } = await supabase
    .from("cancha_bookings")
    .update({
      status: "confirmada",
      payment_status: paymentStatus,
      paid_amount: paidAmount,
    })
    .eq("id", bookingId);

  if (!error && booking) {
    await notifyBookingConfirmed(supabase, booking.booked_by, {
      cancha_id: booking.cancha_id,
      cancha_name: (booking.canchas as any).name,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      total_price: booking.total_price,
    });
  }

  return { error: error?.message ?? null };
}

export async function rejectBookingReceipt(
  supabase: SupabaseClient,
  bookingId: string,
  reason: string
): Promise<{ error: string | null }> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: booking } = await supabase
    .from("cancha_bookings")
    .select("*, canchas(name)")
    .eq("id", bookingId)
    .single();

  const { error } = await supabase
    .from("cancha_bookings")
    .update({
      status: "pendiente",
      payment_status: "rechazado",
      rejected_reason: reason,
      expires_at: expiresAt,
    })
    .eq("id", bookingId);

  if (!error && booking) {
    await notifyPaymentRejected(supabase, booking.booked_by, {
      cancha_id: booking.cancha_id,
      cancha_name: (booking.canchas as any).name,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      reason: reason,
    });
  }

  return { error: error?.message ?? null };
}

export async function createPendingBooking(
  supabase: SupabaseClient,
  booking: {
    cancha_id: string;
    booked_by: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    notes?: string;
  }
): Promise<{ data: { id: string; match_id?: string } | null; error: string | null }> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("cancha_bookings")
    .insert({
      ...booking,
      status: "pendiente",
      payment_status: "sin_anticipo",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (!error && data) {
    // Notify owner
    const { data: canchaData } = await supabase
      .from("canchas")
      .select("id, name, owner_id, city, address, venue_id, sport_type")
      .eq("id", booking.cancha_id)
      .single();
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.booked_by)
      .single();

    if (canchaData) {
      await notifyNewBooking(supabase, canchaData.owner_id, {
        cancha_id: canchaData.id,
        cancha_name: canchaData.name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        booker_name: profileData?.full_name || "Usuario",
        booker_id: booking.booked_by,
      });

      // Create linked Event/Match
      let sportNameQuery = canchaData.sport_type;
      if (sportNameQuery.startsWith("futbol")) sportNameQuery = "futbol";

      const { data: sport } = await supabase
        .from("sports")
        .select("id")
        .ilike("name", `%${sportNameQuery}%`)
        .limit(1)
        .maybeSingle();

      const sportId = sport?.id;

      if (sportId) {
        const dStart = new Date(`1970-01-01T${booking.start_time}`);
        const dEnd = new Date(`1970-01-01T${booking.end_time}`);
        let duration = (dEnd.getTime() - dStart.getTime()) / 60000;
        if (duration < 0) duration += 24 * 60;
        
        const { data: match } = await supabase
          .from("matches")
          .insert({
            organizer_id: booking.booked_by,
            sport_id: sportId,
            title: `Partido en ${canchaData.name}`,
            description: "Partido privado organizado desde tu reserva.",
            skill_level: "intermedio",
            city: canchaData.city || "Ciudad",
            location: canchaData.address || canchaData.name,
            starts_at: `${booking.booking_date}T${booking.start_time}`,
            duration_minutes: duration,
            max_players: 10,
            status: "open",
            venue_id: canchaData.venue_id,
            is_public: false,
            cancha_booking_id: data.id,
          })
          .select("id")
          .single();

        if (match) {
          await supabase.from("match_participants").insert({
            match_id: match.id,
            user_id: booking.booked_by,
            status: "confirmed",
            confirmed_at: new Date().toISOString()
          });

          return { data: { id: data.id, match_id: match.id }, error: null };
        }
      }
    }
  }

  return { data, error: error?.message ?? null };
}
