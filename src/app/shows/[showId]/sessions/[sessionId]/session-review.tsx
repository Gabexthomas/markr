"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ButtonColor, ButtonType, Fps } from "@/lib/supabase/types";
import { formatElapsed } from "@/lib/format-timecode";
import { computeExportMarkers } from "@/lib/exports/types";
import { generatePremiereXml } from "@/lib/exports/premiere-xml";
import { generateCsv } from "@/lib/exports/csv";
import { generateSectionSheet } from "@/lib/exports/section-sheet";
import { generateTimecodesMarkdown } from "@/lib/exports/timecodes";
import { generateClipSheet } from "@/lib/exports/clip-sheet";
import { downloadOrShare, sanitizeFilename } from "@/lib/exports/download";
import {
  deleteMarkerAction,
  nudgeMarkerAction,
  updateMarkerNoteAction,
  updateSessionOffsetAction,
  updateSessionTitleAction,
} from "./actions";

type Marker = {
  id: string;
  label: string;
  color: ButtonColor;
  type: ButtonType;
  tapped_at: string;
  note: string | null;
};

type Show = { id: string; name: string; fps: Fps };
type Session = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  offset_seconds: number;
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

// Memoized, with only stable (useCallback'd, see below) function props, so
// editing/nudging/deleting one row — or a fresh router.refresh() bringing in
// the same marker data — doesn't re-render every other row in what can be a
// 25+ item list for a long episode.
function MarkerRowImpl({
  marker,
  startMs,
  offsetSeconds,
  isEditing,
  isBusy,
  onToggleEdit,
  onNudge,
  onSaveNote,
  onDelete,
}: {
  marker: Marker;
  startMs: number;
  offsetSeconds: number;
  isEditing: boolean;
  isBusy: boolean;
  onToggleEdit: (markerId: string) => void;
  onNudge: (markerId: string, delta: number) => void;
  onSaveNote: (markerId: string, note: string) => void;
  onDelete: (markerId: string, label: string) => void;
}) {
  const elapsedMs = new Date(marker.tapped_at).getTime() - startMs + offsetSeconds * 1000;
  return (
    <li className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-neutral-400">
          {formatElapsed(elapsedMs)}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium text-white ${COLOR_CLASS[marker.color]}`}
        >
          {marker.label}
        </span>
        {marker.note && !isEditing && (
          <span className="truncate text-sm text-neutral-400">{marker.note}</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          disabled={isBusy}
          onClick={() => onNudge(marker.id, -1)}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-30"
        >
          −1s
        </button>
        <button
          disabled={isBusy}
          onClick={() => onNudge(marker.id, 1)}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-30"
        >
          +1s
        </button>
        <button
          onClick={() => onToggleEdit(marker.id)}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-300 hover:text-foreground"
        >
          {isEditing ? "Cancel" : "Edit note"}
        </button>
        <button
          disabled={isBusy}
          onClick={() => onDelete(marker.id, marker.label)}
          className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-30"
        >
          Delete
        </button>
      </div>

      {isEditing && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            defaultValue={marker.note ?? ""}
            rows={2}
            id={`note-${marker.id}`}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-foreground focus:border-neutral-500 focus:outline-none"
          />
          <button
            disabled={isBusy}
            onClick={() => {
              const el = document.getElementById(
                `note-${marker.id}`
              ) as HTMLTextAreaElement | null;
              onSaveNote(marker.id, el?.value ?? "");
            }}
            className="self-start rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
          >
            Save note
          </button>
        </div>
      )}
    </li>
  );
}

const MarkerRow = memo(MarkerRowImpl);

export function SessionReview({
  show,
  session,
  markers,
}: {
  show: Show;
  session: Session;
  markers: Marker[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [offsetInput, setOffsetInput] = useState(String(session.offset_seconds));
  const [savingOffset, setSavingOffset] = useState(false);
  const [colorLabels, setColorLabels] = useState(false);
  const [exportingKind, setExportingKind] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(session.title);
  const [savingTitle, setSavingTitle] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The live session screen navigates here with ?ended=1 right after
  // writing ended_at, instead of showing a "session ended" message on the
  // now-stale live screen. Show it briefly here, then strip the param so a
  // refresh or the back button doesn't re-trigger it.
  const [showEndedToast, setShowEndedToast] = useState(() => searchParams.get("ended") === "1");

  useEffect(() => {
    if (!showEndedToast) return;
    router.replace(pathname, { scroll: false });
    const timeout = setTimeout(() => setShowEndedToast(false), 4000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEndedToast]);

  const startMs = new Date(session.started_at).getTime();

  function openTitleEdit() {
    setTitleInput(session.title);
    setEditingTitle(true);
  }

  async function handleSaveTitle() {
    if (!titleInput.trim()) {
      setError("Title can't be empty.");
      return;
    }
    setSavingTitle(true);
    setError("");
    try {
      await updateSessionTitleAction(show.id, session.id, titleInput);
      setEditingTitle(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save title.");
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleSaveOffset() {
    const value = Number(offsetInput);
    if (Number.isNaN(value)) {
      setError("Offset must be a number.");
      return;
    }
    setSavingOffset(true);
    setError("");
    try {
      await updateSessionOffsetAction(show.id, session.id, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save offset.");
    } finally {
      setSavingOffset(false);
    }
  }

  const handleToggleEdit = useCallback((markerId: string) => {
    setEditingId((cur) => (cur === markerId ? null : markerId));
  }, []);

  const handleNudge = useCallback(
    async (markerId: string, delta: number) => {
      setBusyId(markerId);
      setError("");
      try {
        await nudgeMarkerAction(show.id, session.id, markerId, delta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to nudge marker.");
      } finally {
        setBusyId(null);
      }
    },
    [show.id, session.id]
  );

  const handleSaveNote = useCallback(
    async (markerId: string, note: string) => {
      setBusyId(markerId);
      setError("");
      try {
        await updateMarkerNoteAction(show.id, session.id, markerId, note);
        setEditingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save note.");
      } finally {
        setBusyId(null);
      }
    },
    [show.id, session.id]
  );

  const handleDelete = useCallback(
    async (markerId: string, label: string) => {
      if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
      setBusyId(markerId);
      setError("");
      try {
        await deleteMarkerAction(show.id, session.id, markerId);
        setEditingId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete marker.");
      } finally {
        setBusyId(null);
      }
    },
    [show.id, session.id]
  );

  async function runExport(kind: string, fn: () => Promise<void> | void) {
    setExportingKind(kind);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExportingKind(null);
    }
  }

  const baseFilename = sanitizeFilename(`${show.name}-${session.title}`);
  const exportMarkers = computeExportMarkers(markers, session.started_at, session.offset_seconds);
  const lastMarkerTappedAt = markers.length > 0 ? markers[markers.length - 1].tapped_at : null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-10">
      {showEndedToast && (
        <p className="rounded-lg border border-green-800 bg-green-950/40 px-3 py-2 text-sm text-green-300">
          ✓ Session ended — {markers.length} marker{markers.length === 1 ? "" : "s"} saved.
        </p>
      )}

      <div>
        {editingTitle ? (
          <div className="flex gap-2">
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              autoFocus
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-lg text-foreground focus:border-neutral-500 focus:outline-none"
            />
            <button
              onClick={handleSaveTitle}
              disabled={savingTitle}
              className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
            >
              {savingTitle ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditingTitle(false)}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={openTitleEdit} className="flex items-center gap-2 text-left">
            <h2 className="text-lg font-medium">{session.title}</h2>
            <span className="text-sm text-neutral-500">✎</span>
          </button>
        )}
        <p className="text-sm text-neutral-500">
          {markers.length} marker{markers.length === 1 ? "" : "s"} · {show.fps} fps
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <label htmlFor="offset" className="text-sm text-neutral-400">
          Session offset (seconds) — positive if you hit Start late relative to the recorder
        </label>
        <div className="flex gap-2">
          <input
            id="offset"
            type="number"
            step="1"
            value={offsetInput}
            onChange={(e) => setOffsetInput(e.target.value)}
            className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-base text-foreground focus:border-neutral-500 focus:outline-none"
          />
          <button
            onClick={handleSaveOffset}
            disabled={savingOffset || Number(offsetInput) === session.offset_seconds}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
          >
            {savingOffset ? "Saving..." : "Save offset"}
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {markers.length === 0 && (
          <li className="py-4 text-center text-sm text-neutral-500">No markers in this session.</li>
        )}
        {markers.map((marker) => (
          <MarkerRow
            key={marker.id}
            marker={marker}
            startMs={startMs}
            offsetSeconds={session.offset_seconds}
            isEditing={editingId === marker.id}
            isBusy={busyId === marker.id}
            onToggleEdit={handleToggleEdit}
            onNudge={handleNudge}
            onSaveNote={handleSaveNote}
            onDelete={handleDelete}
          />
        ))}
      </ul>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <h3 className="text-sm font-medium text-neutral-300">Export</h3>

        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            checked={colorLabels}
            onChange={(e) => setColorLabels(e.target.checked)}
          />
          Color labels in export (Premiere XML only, e.g. &quot;[RED] Edit Point&quot;)
        </label>

        <div className="flex flex-col gap-2">
          <button
            disabled={exportingKind !== null}
            onClick={() =>
              runExport("xml", async () => {
                const xml = generatePremiereXml({
                  sequenceName: `${show.name} — ${session.title}`,
                  fps: show.fps,
                  markers: exportMarkers,
                  colorLabels,
                });
                await downloadOrShare(`${baseFilename}.xml`, xml, "application/xml");
              })
            }
            className="rounded-lg bg-red-500 px-4 py-4 text-base font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {exportingKind === "xml" ? "Exporting..." : "Export Premiere Pro XML"}
          </button>

          <button
            disabled={exportingKind !== null}
            onClick={() =>
              runExport("csv", async () => {
                const csv = generateCsv({ fps: show.fps, markers: exportMarkers });
                await downloadOrShare(`${baseFilename}.csv`, csv, "text/csv");
              })
            }
            className="rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-50"
          >
            {exportingKind === "csv" ? "Exporting..." : "Export CSV"}
          </button>

          <button
            disabled={exportingKind !== null}
            onClick={() =>
              runExport("sectionsheet", async () => {
                const csv = generateSectionSheet({ markers: exportMarkers });
                await downloadOrShare(`${baseFilename}-section-sheet.csv`, csv, "text/csv");
              })
            }
            className="rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-50"
          >
            {exportingKind === "sectionsheet" ? "Exporting..." : "Export Section Sheet"}
          </button>

          <button
            disabled={exportingKind !== null}
            onClick={() =>
              runExport("timecodes", async () => {
                const md = generateTimecodesMarkdown({
                  sessionTitle: session.title,
                  showName: show.name,
                  startedAt: session.started_at,
                  endedAt: session.ended_at,
                  lastMarkerTappedAt,
                  markers: exportMarkers,
                });
                await downloadOrShare(
                  `${sanitizeFilename(session.title)}-timecodes.md`,
                  md,
                  "text/markdown"
                );
              })
            }
            className="rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-50"
          >
            {exportingKind === "timecodes" ? "Exporting..." : "Export Timecodes"}
          </button>

          <button
            disabled={exportingKind !== null}
            onClick={() =>
              runExport("clipsheet", async () => {
                const text = generateClipSheet({
                  sessionTitle: session.title,
                  markers: exportMarkers,
                });
                await downloadOrShare(`${baseFilename}-clip-sheet.md`, text, "text/markdown");
              })
            }
            className="rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-50"
          >
            {exportingKind === "clipsheet" ? "Exporting..." : "Export Clip Sheet"}
          </button>
        </div>
      </div>
    </div>
  );
}
