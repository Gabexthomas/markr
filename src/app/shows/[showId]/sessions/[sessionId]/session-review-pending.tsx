"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Fps } from "@/lib/supabase/types";
import { loadSession } from "@/lib/offline/storage";
import { syncSession } from "@/lib/offline/sync";
import { useIsHydrated } from "@/lib/use-is-hydrated";
import { SessionReview } from "./session-review";

// Shown in place of the Supabase-backed review when a session was just
// ended and hasn't finished syncing yet. Reads the same localStorage record
// the live session screen wrote, so the producer sees their markers
// immediately instead of a stuck "loading" state on flaky wifi. Retries the
// sync and asks the server component to re-render on every attempt, so once
// the row lands in Supabase this hands off to the normal, fully-interactive
// review page automatically.
export function PendingSessionReview({
  show,
  sessionId,
}: {
  show: { id: string; name: string; fps: Fps };
  sessionId: string;
}) {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const [local, setLocal] = useState(() => loadSession(sessionId));

  useEffect(() => {
    let cancelled = false;
    async function attempt() {
      await syncSession(sessionId);
      if (cancelled) return;
      setLocal(loadSession(sessionId));
      router.refresh();
    }
    void attempt();
    const interval = setInterval(() => void attempt(), 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, router]);

  if (!hydrated) return null;

  if (!local) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-neutral-400">
          This session hasn&apos;t synced yet. Check your connection and try again.
        </p>
        <Link
          href={`/shows/${show.id}/sessions/${sessionId}`}
          className="rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-300 hover:border-neutral-500"
        >
          Refresh
        </Link>
      </div>
    );
  }

  const markers = local.markers
    .filter((m) => !m.deleted)
    .sort((a, b) => new Date(a.tapped_at).getTime() - new Date(b.tapped_at).getTime())
    .map((m) => ({
      id: m.id,
      label: m.label,
      color: m.color,
      type: m.type,
      tapped_at: m.tapped_at,
      note: m.note,
    }));

  return (
    <>
      <p className="mx-4 mt-3 rounded-lg border border-amber-800 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
        Syncing this session in the background — showing what&apos;s saved on this device.
      </p>
      <SessionReview
        show={show}
        session={{
          id: local.session.id,
          title: local.session.title,
          started_at: local.session.started_at,
          ended_at: local.session.ended_at,
          offset_seconds: local.session.offset_seconds,
        }}
        markers={markers}
      />
    </>
  );
}
