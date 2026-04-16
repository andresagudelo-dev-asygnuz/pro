import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handler del link de confirmación que Supabase envía por email.
// Ver: https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // Prevenir open redirect: solo aceptamos paths same-origin.
      const target = safeRelativePath(next) ?? "/onboarding";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}

function safeRelativePath(input: string): string | null {
  // Solo paths que empiecen con "/" y no con "//" (evita protocol-relative).
  if (!input.startsWith("/")) return null;
  if (input.startsWith("//")) return null;
  if (input.startsWith("/\\")) return null;
  return input;
}
