import { formatElapsed } from "@/lib/format-timecode";
import type { ExportMarker } from "./types";

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Unlike the other exports, this one is for humans to skim, not for
// importing into an editor — so timecodes are H:MM:SS elapsed time rather
// than frame-based, and every marker type is included, unfiltered.
export function generateSectionSheet({ markers }: { markers: ExportMarker[] }): string {
  const header = "Timecode,Label,Note";
  const rows = markers.map((m) => {
    const tc = formatElapsed(m.elapsedSeconds * 1000);
    return [tc, csvField(m.label), csvField(m.note ?? "")].join(",");
  });
  return [header, ...rows].join("\r\n") + "\r\n";
}
