"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Markers cascade-delete with their session (see migration 0001), so this
// is the only query needed.
export async function deleteSessionAction(showId: string, sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/shows/${showId}/sessions`);
}
