import { formatElapsed } from "@/lib/format-timecode";
import type { ExportMarker } from "./types";

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

// "8 July 2026" — day, full month name, year, no ordinal suffix or comma.
// Locale is pinned to en-GB (rather than left to the browser) so the
// day-month-year order and lack of a comma are guaranteed regardless of
// the reader's own locale.
function formatSessionDate(startedAt: string): string {
  return new Date(startedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function generateTimecodesMarkdown({
  sessionTitle,
  showName,
  startedAt,
  endedAt,
  lastMarkerTappedAt,
  markers,
}: {
  sessionTitle: string;
  showName: string;
  startedAt: string;
  /** null if the session hasn't finished syncing ended_at yet. */
  endedAt: string | null;
  /** Raw (non-offset) tapped_at of the chronologically last marker, for the duration fallback. */
  lastMarkerTappedAt: string | null;
  markers: ExportMarker[];
}): string {
  const startMs = new Date(startedAt).getTime();
  const fallbackEndMs = lastMarkerTappedAt ? new Date(lastMarkerTappedAt).getTime() : startMs;
  const endMs = endedAt ? new Date(endedAt).getTime() : fallbackEndMs;
  const durationMs = Math.max(0, endMs - startMs);

  const lines = [
    `# ${sessionTitle}`,
    "",
    `**Show:** ${showName}  `,
    `**Date:** ${formatSessionDate(startedAt)}  `,
    `**Duration:** ${formatElapsed(durationMs)}  `,
    `**Total markers:** ${markers.length}`,
    "",
    "---",
    "",
    "| Time | Marker | Note |",
    "|------|--------|------|",
  ];

  for (const marker of markers) {
    const time = formatElapsed(marker.elapsedSeconds * 1000);
    const label = escapeMarkdownCell(marker.label);
    const note = marker.note ? escapeMarkdownCell(marker.note) : "";
    lines.push(`| ${time} | ${label} | ${note} |`);
  }

  return lines.join("\n") + "\n";
}
