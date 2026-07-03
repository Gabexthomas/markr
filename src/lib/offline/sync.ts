import { createClient } from "@/lib/supabase/client";
import {
  deleteSession,
  isFullySynced,
  listAllSessionIds,
  loadSession,
  saveSession,
} from "./storage";
import type { LocalSessionState } from "./types";

// Pushes whatever in a session is still unsynced to Supabase, via upsert so
// it's safe to call repeatedly (retries just re-send the same rows). Client-
// generated UUIDs mean there's no local-id-to-server-id remapping to do.
export async function syncSession(sessionId: string): Promise<LocalSessionState | null> {
  const state = loadSession(sessionId);
  if (!state) return null;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return state;

  const supabase = createClient();
  let changed = false;

  if (!state.session.synced) {
    const { error } = await supabase.from("sessions").upsert({
      id: state.session.id,
      show_id: state.session.show_id,
      title: state.session.title,
      started_at: state.session.started_at,
      ended_at: state.session.ended_at,
      offset_seconds: state.session.offset_seconds,
    });
    if (!error) {
      state.session.synced = true;
      changed = true;
    }
  }

  // Markers have a foreign key to sessions, so don't push them until the
  // parent session row exists.
  if (state.session.synced) {
    const pending = state.markers.filter((m) => !m.synced);
    if (pending.length > 0) {
      const { error } = await supabase.from("markers").upsert(
        pending.map((m) => ({
          id: m.id,
          session_id: m.session_id,
          button_id: m.button_id,
          label: m.label,
          color: m.color,
          type: m.type,
          tapped_at: m.tapped_at,
          note: m.note,
          deleted: m.deleted,
        }))
      );
      if (!error) {
        pending.forEach((m) => (m.synced = true));
        changed = true;
      }
    }
  }

  if (changed) saveSession(state);

  // Once a fully-synced session has also ended, there's nothing left to
  // retry or resume — clear it out instead of accumulating dead keys.
  if (state.session.ended_at && isFullySynced(state)) {
    deleteSession(sessionId);
  }

  return state;
}

export async function syncAllPendingSessions() {
  for (const sessionId of listAllSessionIds()) {
    const state = loadSession(sessionId);
    if (!state || isFullySynced(state)) continue;
    await syncSession(sessionId).catch(() => {});
  }
}
