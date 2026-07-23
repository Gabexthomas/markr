"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ButtonColor, ButtonType } from "@/lib/supabase/types";
import { formatElapsed } from "@/lib/format-timecode";
import { BUTTON_BG_CLASS } from "@/lib/button-colors";
import { getActiveSessionId, loadSession, saveSession, setActiveSessionId } from "@/lib/offline/storage";
import { syncSession } from "@/lib/offline/sync";
import { useIsHydrated } from "@/lib/use-is-hydrated";
import type { LocalMarker, LocalSession, LocalSessionState } from "@/lib/offline/types";
import { LiveTimer } from "./live-timer";
import { MarkerButton } from "./marker-button";
import { MarkerToast, type MarkerToastHandle } from "./marker-toast";

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

const COLOR_CLASS = BUTTON_BG_CLASS;

function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(15);
  }
}

function defaultSessionTitle() {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

// Memoized and given only stable callback props (see the useCallback wrappers
// around handleToggleEditMarker/updateMarkerNote/deleteMarker below) so
// appending a new marker — a new row mounting — doesn't re-render every
// previous row. Old marker objects keep their reference across a tap since
// persistUpdate only appends to the array, so unaffected rows see identical
// props and React.memo bails out.
function SessionLogRowImpl({
  marker,
  startedAt,
  isEditing,
  onToggleEdit,
  onUpdateNote,
  onDelete,
}: {
  marker: LocalMarker;
  startedAt: string;
  isEditing: boolean;
  onToggleEdit: (markerId: string) => void;
  onUpdateNote: (markerId: string, note: string) => void;
  onDelete: (markerId: string) => void;
}) {
  const markerElapsed = new Date(marker.tapped_at).getTime() - new Date(startedAt).getTime();
  return (
    <li className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
      <button
        onClick={() => onToggleEdit(marker.id)}
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
            onBlur={(e) => onUpdateNote(marker.id, e.target.value)}
            placeholder="Note..."
            rows={2}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          <button
            onClick={() => onDelete(marker.id)}
            className="self-start rounded-lg px-3 py-2 text-sm text-red-400 hover:text-red-300"
          >
            Delete marker
          </button>
        </div>
      )}
    </li>
  );
}

const SessionLogRow = memo(SessionLogRowImpl);

export function LiveSessionScreen({ show, buttons }: { show: Show; buttons: ShowButton[] }) {
  const router = useRouter();
  const [state, setState] = useState<LocalSessionState | null>(() =>
    restoreActiveSession(show.id)
  );
  const hydrated = useIsHydrated();
  const [logOpen, setLogOpen] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  // Set the instant End session is confirmed, before the ended_at write
  // flips `state.session.ended_at` truthy. Without this, that state flip
  // lands one render before router.replace()'s navigation actually swaps
  // the page, so the "Start recording" branch below would flash for a
  // frame. Never reset back to false — this component is navigating away
  // for good once it's set.
  const [isEnding, setIsEnding] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const toastRef = useRef<MarkerToastHandle>(null);

  // Mirrors `state` after every commit so event handlers below can read the
  // latest session/markers without needing `state` in their own dependency
  // list — that's what lets those handlers stay referentially stable across
  // every tap (see persistUpdate + useCallback below), which in turn is what
  // lets MarkerButton/SessionLogRow's React.memo actually bail for rows a
  // given tap didn't touch.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persist = useCallback((next: LocalSessionState) => {
    setState(next);
    saveSession(next);
    void syncSession(next.session.id);
  }, []);

  // Same as `persist`, but takes an updater so callers get a stable
  // useCallback identity (empty deps) while still always operating on the
  // truly-latest state — the standard fix for "stable callback + fresh data"
  // without risking a stale closure over `state`.
  const persistUpdate = useCallback((updater: (cur: LocalSessionState) => LocalSessionState) => {
    setState((cur) => {
      if (!cur) return cur;
      const next = updater(cur);
      saveSession(next);
      void syncSession(next.session.id);
      return next;
    });
  }, []);

  function handleStart() {
    const id = crypto.randomUUID();
    const session: LocalSession = {
      id,
      show_id: show.id,
      title: titleInput.trim() || defaultSessionTitle(),
      started_at: new Date().toISOString(),
      ended_at: null,
      offset_seconds: 0,
      synced: false,
    };
    setActiveSessionId(show.id, id);
    persist({ session, markers: [] });
  }

  const handleTapButton = useCallback(
    (button: ShowButton) => {
      const cur = stateRef.current;
      if (!cur) return;
      const tappedAt = new Date();
      const marker: LocalMarker = {
        id: crypto.randomUUID(),
        session_id: cur.session.id,
        button_id: button.id,
        label: button.label,
        color: button.color,
        type: button.type,
        tapped_at: tappedAt.toISOString(),
        note: null,
        deleted: false,
        synced: false,
      };
      persistUpdate((latest) => ({ ...latest, markers: [...latest.markers, marker] }));
      vibrate();
      const elapsedMs =
        tappedAt.getTime() -
        new Date(cur.session.started_at).getTime() +
        cur.session.offset_seconds * 1000;
      toastRef.current?.show(`${button.label} at ${formatElapsed(elapsedMs)}`);
    },
    [persistUpdate]
  );

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

  const updateMarkerNote = useCallback(
    (markerId: string, note: string) => {
      persistUpdate((cur) => ({
        ...cur,
        markers: cur.markers.map((m) =>
          m.id === markerId ? { ...m, note: note || null, synced: false } : m
        ),
      }));
    },
    [persistUpdate]
  );

  const deleteMarker = useCallback(
    (markerId: string) => {
      persistUpdate((cur) => ({
        ...cur,
        markers: cur.markers.map((m) =>
          m.id === markerId ? { ...m, deleted: true, synced: false } : m
        ),
      }));
      setEditingMarkerId(null);
    },
    [persistUpdate]
  );

  const handleToggleEditMarker = useCallback((markerId: string) => {
    setEditingMarkerId((cur) => (cur === markerId ? null : markerId));
  }, []);

  function handleEndSession() {
    if (!state) return;
    setIsEnding(true);
    setActiveSessionId(show.id, null);
    persist({
      ...state,
      session: { ...state.session, ended_at: new Date().toISOString(), synced: false },
    });
    // replace (not push) so the back button returns to the show page, not
    // this now-stale live session screen.
    router.replace(`/shows/${show.id}/sessions/${state.session.id}?ended=1`);
    setConfirmingEnd(false);
  }

  if (!hydrated) return null;

  // Navigation is already underway — render nothing rather than let the
  // "Start recording" branch below flash for a frame while router.replace()
  // catches up. The body background is already dark, so null here shows no
  // flash-of-white either.
  if (isEnding) return null;

  if (!state || state.session.ended_at) {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="border-b border-neutral-800 px-4 py-4">
          <Link href={`/shows/${show.id}`} className="text-neutral-400">
            ← {show.name}
          </Link>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex w-full max-w-xs flex-col gap-2">
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. Ep 47 – Guest name"
              aria-label="Session title"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-center text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
            />
            <p className="text-xs text-neutral-400">
              <span className="text-red-500">⏺</span> Timer starts immediately when you tap Start
            </p>
          </div>
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

  const visibleMarkers = [...state.markers].filter((m) => !m.deleted).reverse();

  // Only used to seed each MarkerButton's tap count on mount (e.g. after a
  // reload mid-session) — every subsequent tap updates that button's own
  // local state instead, so this doesn't need to be recomputed for anything
  // but that initial value.
  const tapCounts = new Map<string, number>();
  for (const m of state.markers) {
    if (m.deleted || !m.button_id) continue;
    tapCounts.set(m.button_id, (tapCounts.get(m.button_id) ?? 0) + 1);
  }

  return (
    <main className="flex min-h-screen flex-col pb-6">
      <MarkerToast ref={toastRef} />
      <header className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{state.session.title}</p>
          <p className="truncate text-xs text-neutral-500">{show.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <LiveTimer startedAt={state.session.started_at} />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        {buttons.length === 0 && (
          <p className="col-span-2 text-center text-sm text-neutral-500 sm:col-span-3">
            No buttons yet — add some in show setup.
          </p>
        )}
        {buttons.map((button) => (
          <MarkerButton
            key={`${state.session.id}-${button.id}`}
            button={button}
            initialCount={tapCounts.get(button.id) ?? 0}
            onTap={handleTapButton}
          />
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
            {visibleMarkers.map((marker) => (
              <SessionLogRow
                key={marker.id}
                marker={marker}
                startedAt={state.session.started_at}
                isEditing={editingMarkerId === marker.id}
                onToggleEdit={handleToggleEditMarker}
                onUpdateNote={updateMarkerNote}
                onDelete={deleteMarker}
              />
            ))}
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
