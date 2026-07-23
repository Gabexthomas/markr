import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SessionReview } from "./session-review";
import { PendingSessionReview } from "./session-review-pending";

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
  // sync yet — that's a transient state, not a 404. Fall back to the
  // localStorage copy the live session screen wrote so the review page
  // never gets stuck on "loading" while on flaky wifi.
  if (!session) {
    return (
      <main className="flex min-h-screen flex-col">
        <PageHeader title={show.name} backHref={`/shows/${show.id}`} />
        <PendingSessionReview show={show} sessionId={sessionId} />
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
      <PageHeader title={show.name} backHref={`/shows/${show.id}`} />
      <SessionReview show={show} session={session} markers={markers ?? []} />
    </main>
  );
}
