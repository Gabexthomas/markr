import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Implicit flow puts the session directly in the redirect URL's
      // fragment instead of requiring a stored PKCE code verifier, so
      // magic links work even if they're opened in a different browser
      // context (e.g. an email app's in-app browser) than the one that
      // requested them.
      auth: { flowType: "implicit" },
    }
  );
}
