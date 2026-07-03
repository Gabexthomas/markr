import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SessionReview } from "./session-review";

export default async function SessionReviewPage({
  params,
}: {
  params: Promise<{ showId: string; sessionId: string }>;
}) {
  const { showId, sessionId } = await params;
  const supabase = await createClient();

  const { data: show } = await supabase
    .from("shows")
    .select("id, name, fps")
    .eq("id", showId)
    .maybeSingle();

  if (!show) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, started_at, ended_at, offset_seconds")
    .eq("id", sessionId)
    .eq("show_id", showId)
    .maybeSingle();

  // A session that was just ended may not have finished its background
  // sync yet — that's a transient state, not a 404.
  if (!session) {
    return (
      <main className="flex min-h-screen flex-col">
        <PageHeader title={show.name} backHref={`/shows/${show.id}/sessions`} />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-neutral-400">
            This session hasn&apos;t synced yet. Check your connection and try again.
          </p>
          <Link
            href={`/shows/${showId}/sessions/${sessionId}`}
            className="rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-300 hover:border-neutral-500"
          >
            Refresh
          </Link>
        </div>
      </main>
    );
  }

  const { data: markers } = await supabase
    .from("markers")
    .select("id, label, color, type, tapped_at, note")
    .eq("session_id", sessionId)
    .eq("deleted", false)
    .order("tapped_at", { ascending: true });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title={show.name} backHref={`/shows/${show.id}/sessions`} />
      <SessionReview show={show} session={session} markers={markers ?? []} />
    </main>
  );
}
