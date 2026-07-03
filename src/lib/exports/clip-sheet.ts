import { formatElapsed } from "@/lib/format-timecode";
import type { ExportMarker } from "./types";

// "Clip/Reel-type markers" means markers from the default Clip/Reel
// button specifically (matched by label, since type is only 'marker' or
// 'segment' — there's no finer-grained clip subtype in the schema).
export function generateClipSheet({
  sessionTitle,
  markers,
}: {
  sessionTitle: string;
  markers: ExportMarker[];
}): string {
  const clips = markers.filter((m) => m.label === "Clip/Reel");

  const lines = [`# Clip sheet — ${sessionTitle}`, ""];
  if (clips.length === 0) {
    lines.push("No Clip/Reel markers in this session.");
  } else {
    for (const clip of clips) {
      const tc = formatElapsed(clip.elapsedSeconds * 1000);
      lines.push(clip.note ? `- **${tc}** — ${clip.note}` : `- **${tc}**`);
    }
  }
  return lines.join("\n") + "\n";
}
