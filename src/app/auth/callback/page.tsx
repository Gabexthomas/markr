"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase redirects here after the user clicks the magic-link email, with
// the session in the URL fragment (#access_token=...). Fragments never
// reach a server, so this has to run client-side: creating the browser
// client triggers @supabase/ssr to read the fragment, store the session in
// cookies, and strip it from the URL — we just wait for that to finish.
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Failed to read session from magic link:", error);
        router.replace(`/login?error=${encodeURIComponent(error.message)}`);
        return;
      }

      if (data.session) {
        router.replace("/");
      } else {
        router.replace(
          `/login?error=${encodeURIComponent("Sign-in link was invalid or expired.")}`
        );
      }
    });
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="h-12 w-12 rounded-full bg-red-500" />
      <p className="text-sm text-neutral-400">Signing you in...</p>
    </main>
  );
}
