import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SessionHistoryList } from "./session-history-list";

export default async function SessionHistoryPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const supabase = await createClient();

  const { data: show } = await supabase
    .from("shows")
    .select("id, name")
    .eq("id", showId)
    .maybeSingle();

  if (!show) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, started_at, ended_at")
    .eq("show_id", showId)
    .order("started_at", { ascending: false });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title={`${show.name} — history`} backHref={`/shows/${show.id}`} />

      <div className="flex flex-1 flex-col gap-2 p-4">
        {!sessions || sessions.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500">
            No sessions yet — start one from the show page.
          </p>
        ) : (
          <SessionHistoryList showId={show.id} sessions={sessions} />
        )}
      </div>
    </main>
  );
}
