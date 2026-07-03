import type { Fps } from "@/lib/supabase/types";
import { framesToTimecode, secondsToFrames } from "./timecode";
import type { ExportMarker } from "./types";

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Matches Premiere's own marker CSV export layout: Marker Name,
// Description, In, Out, Duration, Marker Type. Markers are points, not
// ranges, so Out equals In and Duration is zero.
export function generateCsv({ fps, markers }: { fps: Fps; markers: ExportMarker[] }): string {
  const header = "Marker Name,Description,In,Out,Duration,Marker Type";
  const rows = markers.map((m) => {
    const tc = framesToTimecode(secondsToFrames(m.elapsedSeconds, fps), fps);
    return [csvField(m.label), csvField(m.note ?? ""), tc, tc, "00:00:00:00", "Comment"].join(
      ","
    );
  });
  return [header, ...rows].join("\r\n") + "\r\n";
}
