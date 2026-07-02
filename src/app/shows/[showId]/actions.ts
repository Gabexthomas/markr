"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ButtonColor, ButtonType } from "@/lib/supabase/types";

const VALID_COLORS: ButtonColor[] = [
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "purple",
  "gray",
];
const VALID_TYPES: ButtonType[] = ["marker", "segment"];

function parseButtonFields(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  const type = String(formData.get("type") ?? "");

  if (!label) throw new Error("Label is required.");
  if (!VALID_COLORS.includes(color as ButtonColor)) throw new Error("Invalid color.");
  if (!VALID_TYPES.includes(type as ButtonType)) throw new Error("Invalid type.");

  return { label, color: color as ButtonColor, type: type as ButtonType };
}

export async function createButtonAction(showId: string, formData: FormData) {
  const fields = parseButtonFields(formData);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("buttons")
    .select("sort_order")
    .eq("show_id", showId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase
    .from("buttons")
    .insert({ ...fields, show_id: showId, sort_order: nextSortOrder });

  if (error) throw new Error(error.message);
  revalidatePath(`/shows/${showId}`);
}

export async function updateButtonAction(
  showId: string,
  buttonId: string,
  formData: FormData
) {
  const fields = parseButtonFields(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("buttons").update(fields).eq("id", buttonId);

  if (error) throw new Error(error.message);
  revalidatePath(`/shows/${showId}`);
}

export async function deleteButtonAction(showId: string, buttonId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("buttons").delete().eq("id", buttonId);

  if (error) throw new Error(error.message);
  revalidatePath(`/shows/${showId}`);
}

export async function moveButtonAction(
  showId: string,
  buttonId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient();
  const { data: buttons, error: fetchError } = await supabase
    .from("buttons")
    .select("id, sort_order")
    .eq("show_id", showId)
    .order("sort_order", { ascending: true });

  if (fetchError || !buttons) throw new Error(fetchError?.message ?? "Failed to load buttons.");

  const index = buttons.findIndex((b) => b.id === buttonId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= buttons.length) return;

  const a = buttons[index];
  const b = buttons[swapIndex];

  const [{ error: err1 }, { error: err2 }] = await Promise.all([
    supabase.from("buttons").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("buttons").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (err1 || err2) throw new Error(err1?.message ?? err2?.message);
  revalidatePath(`/shows/${showId}`);
}
