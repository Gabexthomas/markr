import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after the user clicks the magic-link email.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Behind Vercel's proxy, `origin` from the raw request URL can differ
  // from the public hostname the user is actually browsing — use the
  // forwarded host when present so the redirect lands on the right domain.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectBase = isLocalEnv
    ? origin
    : forwardedHost
      ? `https://${forwardedHost}`
      : origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
    console.error("exchangeCodeForSession failed:", error);
    return NextResponse.redirect(
      `${redirectBase}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(
    `${redirectBase}/login?error=${encodeURIComponent("Missing sign-in code in the link.")}`
  );
}
