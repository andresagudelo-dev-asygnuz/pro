"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOrigin } from "@/lib/auth/origin";
import { mapAuthError } from "@/lib/errors/map-db-error";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  formDataToObject,
  signInSchema,
  signUpSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";

export type AuthState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signInSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }
  const { email, password } = parsed.data;

  const supabase = await createClient();

  const rl = await checkRateLimit(supabase, {
    key: `signin:${email.toLowerCase()}`,
    ...RATE_LIMITS.signIn,
  });
  if (!rl.ok) return { error: rl.error };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: mapAuthError(error.message) };

  revalidatePath("/", "layout");
  redirect("/feed");
}

export async function signUpWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }
  const { email, password, full_name } = parsed.data;

  const supabase = await createClient();

  const rl = await checkRateLimit(supabase, {
    key: `signup:${email.toLowerCase()}`,
    ...RATE_LIMITS.signUp,
  });
  if (!rl.ok) return { error: rl.error };

  const emailRedirectTo = `${await resolveOrigin()}/auth/confirm`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo,
    },
  });

  if (error) return { error: mapAuthError(error.message) };

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
