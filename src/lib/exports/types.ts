import type { ButtonColor, ButtonType } from "@/lib/supabase/types";

export interface ExportMarker {
  label: string;
  color: ButtonColor;
  type: ButtonType;
  note: string | null;
  /** Elapsed seconds from session start, with the session offset already applied. */
  elapsedSeconds: number;
}

export function computeExportMarkers(
  markers: {
    label: string;
    color: ButtonColor;
    type: ButtonType;
    note: string | null;
    tapped_at: string;
  }[],
  startedAt: string,
  offsetSeconds: number
): ExportMarker[] {
  const startMs = new Date(startedAt).getTime();
  return markers
    .map((m) => ({
      label: m.label,
      color: m.color,
      type: m.type,
      note: m.note,
      elapsedSeconds: Math.max(
        0,
        (new Date(m.tapped_at).getTime() - startMs) / 1000 + offsetSeconds
      ),
    }))
    .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds);
}
