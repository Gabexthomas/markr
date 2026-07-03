import type { ExportMarker } from "./types";

function formatYoutubeTime(totalSeconds: number, useHours: boolean): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  return useHours ? `${hh}:${pad2(mm)}:${pad2(ss)}` : `${mm}:${pad2(ss)}`;
}

// YouTube requires the first chapter at 0:00 — forced regardless of that
// marker's actual elapsed time, per spec. Built only from segment-type
// markers.
export function generateYoutubeChapters({ markers }: { markers: ExportMarker[] }): string {
  const segments = markers.filter((m) => m.type === "segment");
  if (segments.length === 0) return "";

  const useHours = segments[segments.length - 1].elapsedSeconds >= 3600;

  return segments
    .map((m, i) => `${formatYoutubeTime(i === 0 ? 0 : m.elapsedSeconds, useHours)} ${m.label}`)
    .join("\n");
}
