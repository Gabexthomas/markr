import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveSessionScreen } from "./live-session-screen";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const supabase = await createClient();

  const { data: show } = await supabase
    .from("shows")
    .select("id, name, fps")
    .eq("id", showId)
    .maybeSingle();

  if (!show) notFound();

  const { data: buttons } = await supabase
    .from("buttons")
    .select("id, label, color, type, sort_order")
    .eq("show_id", showId)
    .order("sort_order", { ascending: true });

  return <LiveSessionScreen show={show} buttons={buttons ?? []} />;
}
