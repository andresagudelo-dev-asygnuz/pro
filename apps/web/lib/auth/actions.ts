"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
};

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresá email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: traducirError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/feed");
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password || !fullName) {
    return { error: "Completá nombre, email y contraseña." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();
  const emailRedirectTo = `${await resolveOrigin()}/auth/confirm`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: traducirError(error.message) };
  }

  // Si el proyecto tiene "Confirm email" habilitado, no hay sesión todavía.
  if (!data.session) {
    return {
      message:
        "Revisá tu email para confirmar la cuenta. Una vez confirmado, entrá con tu email y contraseña.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// Resuelve el origin del request en runtime para que el email de confirmación
// siempre vuelva al dominio en el que el usuario está (localhost, preview o
// producción) — sin depender de una env var fija tipo NEXT_PUBLIC_SITE_URL.
// Requiere que el dominio esté whitelisted en Supabase → Auth → URL Configuration.
async function resolveOrigin(): Promise<string> {
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  if (origin && origin.startsWith("http")) return origin;

  const forwardedHost = hdrs.get("x-forwarded-host");
  const host = forwardedHost ?? hdrs.get("host") ?? "localhost:3000";
  const proto =
    hdrs.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email o contraseña incorrectos.";
  if (m.includes("user already registered"))
    return "Ya existe una cuenta con ese email. Iniciá sesión.";
  if (m.includes("email not confirmed"))
    return "Todavía no confirmaste tu email. Revisá tu bandeja.";
  return msg;
}
