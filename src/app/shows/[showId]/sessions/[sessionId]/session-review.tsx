"use client";

import { useState } from "react";
import type { ButtonColor, ButtonType, Fps } from "@/lib/supabase/types";
import { formatElapsed } from "@/lib/format-timecode";
import { computeExportMarkers } from "@/lib/exports/types";
import { generatePremiereXml } from "@/lib/exports/premiere-xml";
import { generateCsv } from "@/lib/exports/csv";
import { generateYoutubeChapters } from "@/lib/exports/youtube-chapters";
import { generateClipSheet } from "@/lib/exports/clip-sheet";
import { downloadOrShare, sanitizeFilename } from "@/lib/exports/download";
import {
  deleteMarkerAction,
  nudgeMarkerAction,
  updateMarkerNoteAction,
  updateSessionOffsetAction,
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

  const startMs = new Date(session.started_at).getTime();

  function elapsedMsFor(marker: Marker) {
    return (
      new Date(marker.tapped_at).getTime() - startMs + session.offset_seconds * 1000
    );
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

  async function handleNudge(markerId: string, delta: number) {
    setBusyId(markerId);
    setError("");
    try {
      await nudgeMarkerAction(show.id, session.id, markerId, delta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to nudge marker.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveNote(markerId: string, note: string) {
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
  }

  async function handleDelete(markerId: string, label: string) {
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
  }

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pb-10">
      <div>
        <h2 className="text-lg font-medium">{session.title}</h2>
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
        {markers.map((marker) => {
          const isEditing = editingId === marker.id;
          const isBusy = busyId === marker.id;
          return (
            <li
              key={marker.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-neutral-400">
                  {formatElapsed(elapsedMsFor(marker))}
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
                  onClick={() => handleNudge(marker.id, -1)}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-30"
                >
                  −1s
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => handleNudge(marker.id, 1)}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 disabled:opacity-30"
                >
                  +1s
                </button>
                <button
                  onClick={() => setEditingId(isEditing ? null : marker.id)}
                  className="rounded-lg px-3 py-1.5 text-sm text-neutral-300 hover:text-foreground"
                >
                  {isEditing ? "Cancel" : "Edit note"}
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => handleDelete(marker.id, marker.label)}
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
                      handleSaveNote(marker.id, el?.value ?? "");
                    }}
                    className="self-start rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
                  >
                    Save note
                  </button>
                </div>
              )}
            </li>
          );
        })}
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
              runExport("chapters", async () => {
                const text = generateYoutubeChapters({ markers: exportMarkers });
                if (!text) {
                  setError("No segment-type markers in this session — nothing to export.");
                  return;
                }
                await downloadOrShare(`${baseFilename}-chapters.txt`, text, "text/plain");
              })
            }
            className="rounded-lg border border-neutral-700 px-4 py-3 text-sm text-neutral-200 hover:border-neutral-500 disabled:opacity-50"
          >
            {exportingKind === "chapters" ? "Exporting..." : "Export YouTube Chapters"}
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
