import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ButtonGridEditor } from "./button-grid-editor";

export default async function ShowEditorPage({
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

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title={show.name} backHref="/shows" />
      <ButtonGridEditor showId={show.id} initialButtons={buttons ?? []} />
    </main>
  );
}
