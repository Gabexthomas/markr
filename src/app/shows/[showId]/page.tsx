import Link from "next/link";
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
      <div className="flex flex-col gap-2 px-4 pt-4">
        <Link
          href={`/shows/${show.id}/session`}
          className="flex items-center justify-center rounded-lg bg-red-500 px-4 py-4 text-base font-medium text-white transition-colors hover:bg-red-600"
        >
          ▶ Start session
        </Link>
        <Link
          href={`/shows/${show.id}/sessions`}
          className="flex items-center justify-center rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-300 transition-colors hover:border-neutral-500"
        >
          Session history
        </Link>
      </div>
      <ButtonGridEditor showId={show.id} initialButtons={buttons ?? []} />
    </main>
  );
}
