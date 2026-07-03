"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function path(showId: string, sessionId: string) {
  return `/shows/${showId}/sessions/${sessionId}`;
}

export async function updateMarkerNoteAction(
  showId: string,
  sessionId: string,
  markerId: string,
  note: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("markers")
    .update({ note: note || null })
    .eq("id", markerId);
  if (error) throw new Error(error.message);
  revalidatePath(path(showId, sessionId));
}

export async function deleteMarkerAction(showId: string, sessionId: string, markerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("markers").update({ deleted: true }).eq("id", markerId);
  if (error) throw new Error(error.message);
  revalidatePath(path(showId, sessionId));
}

export async function nudgeMarkerAction(
  showId: string,
  sessionId: string,
  markerId: string,
  deltaSeconds: number
) {
  const supabase = await createClient();
  const { data: marker, error: fetchError } = await supabase
    .from("markers")
    .select("tapped_at")
    .eq("id", markerId)
    .single();
  if (fetchError || !marker) throw new Error(fetchError?.message ?? "Marker not found.");

  const nudged = new Date(new Date(marker.tapped_at).getTime() + deltaSeconds * 1000);
  const { error } = await supabase
    .from("markers")
    .update({ tapped_at: nudged.toISOString() })
    .eq("id", markerId);
  if (error) throw new Error(error.message);
  revalidatePath(path(showId, sessionId));
}

export async function updateSessionOffsetAction(
  showId: string,
  sessionId: string,
  offsetSeconds: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ offset_seconds: offsetSeconds })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(path(showId, sessionId));
}

export async function updateSessionTitleAction(
  showId: string,
  sessionId: string,
  title: string
) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title can't be empty.");
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").update({ title: trimmed }).eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(path(showId, sessionId));
  revalidatePath(`/shows/${showId}/sessions`);
}
