"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteSessionAction } from "./actions";

type Session = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
};

export function SessionHistoryList({
  showId,
  sessions,
}: {
  showId: string;
  sessions: Session[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleDelete(session: Session) {
    if (
      !window.confirm(`Delete "${session.title}"? This removes all its markers too — can't be undone.`)
    ) {
      return;
    }
    setBusyId(session.id);
    setError("");
    try {
      await deleteSessionAction(showId, session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-400">{error}</p>}
      <ul className="flex flex-col gap-2">
        {sessions.map((session) => {
          const inProgress = !session.ended_at;
          return (
            <li
              key={session.id}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-4"
            >
              <Link
                href={`/shows/${showId}/sessions/${session.id}`}
                className="flex min-w-0 flex-1 items-center justify-between gap-2"
              >
                <span className="truncate text-base font-medium">{session.title}</span>
                <span className="shrink-0 text-sm text-neutral-500">
                  {inProgress ? "In progress" : "Ended"}
                </span>
              </Link>
              <button
                disabled={busyId === session.id || inProgress}
                onClick={() => handleDelete(session)}
                title={inProgress ? "Can't delete a session that's still recording" : undefined}
                className="shrink-0 rounded-lg p-2 text-red-400 hover:text-red-300 disabled:opacity-30"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
