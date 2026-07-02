import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="h-16 w-16 rounded-full bg-red-500" />
      <h1 className="text-3xl font-semibold">Markr</h1>
      <p className="max-w-sm text-sm text-neutral-400">
        Signed in as <span className="text-foreground">{user?.email}</span>.
        Shows, buttons, sessions, and exports are coming next.
      </p>
      <SignOutButton />
    </main>
  );
}
