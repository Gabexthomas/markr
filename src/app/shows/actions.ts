"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Fps } from "@/lib/supabase/types";

const VALID_FPS: Fps[] = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

const DEFAULT_BUTTONS = [
  { label: "Edit Point", color: "red", type: "marker", sort_order: 0 },
  { label: "Clip/Reel", color: "purple", type: "marker", sort_order: 1 },
  { label: "Sponsor Read", color: "amber", type: "marker", sort_order: 2 },
  { label: "Mistake/Cough", color: "gray", type: "marker", sort_order: 3 },
] as const;

export async function createShowAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const fpsRaw = Number(formData.get("fps"));
  const fps = VALID_FPS.includes(fpsRaw as Fps) ? (fpsRaw as Fps) : 25;

  if (!name) {
    throw new Error("Show name is required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: show, error: showError } = await supabase
    .from("shows")
    .insert({ name, fps, user_id: user.id })
    .select("id")
    .single();

  if (showError || !show) {
    throw new Error(showError?.message ?? "Failed to create show.");
  }

  const { error: buttonsError } = await supabase.from("buttons").insert(
    DEFAULT_BUTTONS.map((b) => ({ ...b, show_id: show.id }))
  );

  if (buttonsError) {
    throw new Error(buttonsError.message);
  }

  redirect(`/shows/${show.id}`);
}
