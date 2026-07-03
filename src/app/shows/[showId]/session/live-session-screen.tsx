"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { ButtonColor, ButtonType } from "@/lib/supabase/types";
import { formatElapsed } from "@/lib/format-timecode";
import { getActiveSessionId, loadSession, saveSession, setActiveSessionId } from "@/lib/offline/storage";
import { syncSession } from "@/lib/offline/sync";
import type { LocalMarker, LocalSession, LocalSessionState } from "@/lib/offline/types";

type ShowButton = {
  id: string;
  label: string;
  color: ButtonColor;
  type: ButtonType;
  sort_order: number;
};

type Show = {
  id: string;
  name: string;
  fps: number;
};

const COLOR_CLASS: Record<ButtonColor, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  gray: "bg-gray-500",
};

function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(50);
  }
}

const subscribeNever = () => () => {};

// The React-blessed way to know "we're past hydration" without an effect —
// getServerSnapshot returns false so SSR and the first client render agree,
// getSnapshot returns true for every client render after that. Used to gate
// the offline-restored session UI so it never mismatches the server render.
function useIsHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

// Restoring an in-progress session reads localStorage synchronously — no
// network round-trip needed to know one exists, which is what makes a
// reload mid-recording safe.
function restoreActiveSession(showId: string): LocalSessionState | null {
  if (typeof window === "undefined") return null;
  const activeId = getActiveSessionId(showId);
  if (!activeId) return null;
  const restored = loadSession(activeId);
  return restored && !restored.session.ended_at ? restored : null;
}

function LastMarkerNoteInput({
  marker,
  onSave,
}: {
  marker: LocalMarker;
  onSave: (note: string) => void;
}) {
  const [value, setValue] = useState(marker.note ?? "");
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      placeholder={`Add note to "${marker.label}"...`}
      className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
    />
  );
}

export function LiveSessionScreen({ show, buttons }: { show: Show; buttons: ShowButton[] }) {
  const [state, setState] = useState<LocalSessionState | null>(() =>
    restoreActiveSession(show.id)
  );
  const hydrated = useIsHydrated();
  const [now, setNow] = useState(() => Date.now());
  const [flashId, setFlashId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);

  // Cosmetic timer only — recomputed from started_at on every tick, never
  // accumulated. Ticks only while the tab is actually visible, and
  // recomputes immediately on becoming visible again so a locked phone
  // can't drift the display. Deliberately keyed on the session id (not the
  // whole `state` object, which gets a new reference on every marker tap)
  // so tapping a marker doesn't tear down and restart this interval.
  useEffect(() => {
    if (!state) return;
    function tick() {
      setNow(Date.now());
    }
    tick();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, 1000);
    function handleVisible() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.session.id]);

  const persist = useCallback((next: LocalSessionState) => {
    setState(next);
    saveSession(next);
    void syncSession(next.session.id);
  }, []);

  function handleStart() {
    const id = crypto.randomUUID();
    const session: LocalSession = {
      id,
      show_id: show.id,
      title: new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      started_at: new Date().toISOString(),
      ended_at: null,
      offset_seconds: 0,
      synced: false,
    };
    setActiveSessionId(show.id, id);
    persist({ session, markers: [] });
  }

  function handleTapButton(button: ShowButton) {
    if (!state) return;
    const marker: LocalMarker = {
      id: crypto.randomUUID(),
      session_id: state.session.id,
      button_id: button.id,
      label: button.label,
      color: button.color,
      type: button.type,
      tapped_at: new Date().toISOString(),
      note: null,
      deleted: false,
      synced: false,
    };
    persist({ ...state, markers: [...state.markers, marker] });
    setFlashId(button.id);
    vibrate();
    setTimeout(() => setFlashId((cur) => (cur === button.id ? null : cur)), 200);
  }

  const lastMarker = state?.markers.length ? state.markers[state.markers.length - 1] : null;

  function saveLastMarkerNote(note: string) {
    if (!state || !lastMarker) return;
    persist({
      ...state,
      markers: state.markers.map((m) =>
        m.id === lastMarker.id ? { ...m, note: note || null, synced: false } : m
      ),
    });
  }

  function updateMarkerNote(markerId: string, note: string) {
    if (!state) return;
    persist({
      ...state,
      markers: state.markers.map((m) =>
        m.id === markerId ? { ...m, note: note || null, synced: false } : m
      ),
    });
  }

  function deleteMarker(markerId: string) {
    if (!state) return;
    persist({
      ...state,
      markers: state.markers.map((m) =>
        m.id === markerId ? { ...m, deleted: true, synced: false } : m
      ),
    });
    setEditingMarkerId(null);
  }

  function handleEndSession() {
    if (!state) return;
    setActiveSessionId(show.id, null);
    persist({
      ...state,
      session: { ...state.session, ended_at: new Date().toISOString(), synced: false },
    });
    setConfirmingEnd(false);
  }

  if (!hydrated) return null;

  if (!state || state.session.ended_at) {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="border-b border-neutral-800 px-4 py-4">
          <Link href={`/shows/${show.id}`} className="text-neutral-400">
            ← {show.name}
          </Link>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          {state?.session.ended_at && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-neutral-400">
                Last session ended with {state.markers.filter((m) => !m.deleted).length} markers.
              </p>
              <Link
                href={`/shows/${show.id}/sessions/${state.session.id}`}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
              >
                Review session
              </Link>
            </div>
          )}
          <button
            onClick={handleStart}
            className="flex h-40 w-40 items-center justify-center rounded-full bg-red-500 text-2xl font-semibold text-white shadow-lg transition-transform active:scale-95"
          >
            Start
          </button>
        </div>
      </main>
    );
  }

  const elapsedMs = now - new Date(state.session.started_at).getTime();
  const visibleMarkers = [...state.markers].filter((m) => !m.deleted).reverse();

  return (
    <main className="flex min-h-screen flex-col pb-6">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
        <span className="truncate text-sm text-neutral-400">{show.name}</span>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono text-lg tabular-nums">{formatElapsed(elapsedMs)}</span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        {buttons.length === 0 && (
          <p className="col-span-2 text-center text-sm text-neutral-500 sm:col-span-3">
            No buttons yet — add some in show setup.
          </p>
        )}
        {buttons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleTapButton(button)}
            className={`min-h-16 rounded-xl px-3 py-4 text-base font-semibold text-white shadow transition-all active:scale-95 ${
              COLOR_CLASS[button.color]
            } ${flashId === button.id ? "ring-4 ring-white" : ""}`}
          >
            {button.label}
          </button>
        ))}
      </div>

      {lastMarker && (
        <div className="px-4 pb-2">
          <LastMarkerNoteInput
            key={lastMarker.id}
            marker={lastMarker}
            onSave={saveLastMarkerNote}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 pb-2">
        <button
          onClick={() => setLogOpen((v) => !v)}
          className="flex items-center justify-between rounded-lg border border-neutral-800 px-4 py-3 text-sm text-neutral-300"
        >
          <span>Session log ({visibleMarkers.length})</span>
          <span>{logOpen ? "▲" : "▼"}</span>
        </button>

        {logOpen && (
          <ul className="flex flex-col gap-2">
            {visibleMarkers.length === 0 && (
              <li className="py-4 text-center text-sm text-neutral-500">No markers yet.</li>
            )}
            {visibleMarkers.map((marker) => {
              const markerElapsed =
                new Date(marker.tapped_at).getTime() -
                new Date(state.session.started_at).getTime();
              const isEditing = editingMarkerId === marker.id;
              return (
                <li
                  key={marker.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3"
                >
                  <button
                    onClick={() => setEditingMarkerId(isEditing ? null : marker.id)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="font-mono text-sm text-neutral-400">
                      {formatElapsed(markerElapsed)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium text-white ${COLOR_CLASS[marker.color]}`}
                    >
                      {marker.label}
                    </span>
                    {marker.note && (
                      <span className="truncate text-sm text-neutral-400">{marker.note}</span>
                    )}
                  </button>

                  {isEditing && (
                    <div className="mt-3 flex flex-col gap-2">
                      <textarea
                        defaultValue={marker.note ?? ""}
                        onBlur={(e) => updateMarkerNote(marker.id, e.target.value)}
                        placeholder="Note..."
                        rows={2}
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
                      />
                      <button
                        onClick={() => deleteMarker(marker.id)}
                        className="self-start rounded-lg px-3 py-2 text-sm text-red-400 hover:text-red-300"
                      >
                        Delete marker
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto px-4 pt-4">
        {confirmingEnd ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-800 bg-red-950/40 p-3">
            <p className="text-sm text-red-200">
              End this session? You can still review it after.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingEnd(false)}
                className="flex-1 rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white"
              >
                Yes, end session
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingEnd(true)}
            className="w-full rounded-lg border border-neutral-700 px-4 py-4 text-base text-neutral-300 hover:border-neutral-500"
          >
            End session
          </button>
        )}
      </div>
    </main>
  );
}
