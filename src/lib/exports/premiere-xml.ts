import type { Fps } from "@/lib/supabase/types";
import { rateInfoForFps, secondsToFrames } from "./timecode";
import type { ExportMarker } from "./types";

// FCP7 xmeml v4, verified against a real Premiere-exported sample project
// (sequence markers use <comment>/<name>/<in>/<out>, point markers use
// out=-1) and a real Premiere-round-trippable fixture with a completely
// empty <media></media> block — confirming a marker-only sequence with no
// clips imports cleanly, which is all this export needs to do.

const COLOR_LABEL: Record<ExportMarker["color"], string> = {
  red: "RED",
  orange: "ORANGE",
  amber: "AMBER",
  green: "GREEN",
  teal: "TEAL",
  blue: "BLUE",
  purple: "PURPLE",
  gray: "GRAY",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generatePremiereXml({
  sequenceName,
  fps,
  markers,
  colorLabels,
}: {
  sequenceName: string;
  fps: Fps;
  markers: ExportMarker[];
  colorLabels: boolean;
}): string {
  const rate = rateInfoForFps(fps);
  const frames = markers.map((m) => secondsToFrames(m.elapsedSeconds, fps));
  const lastFrame = frames.length > 0 ? Math.max(...frames) : 0;
  // Pad ~1s past the last marker so it isn't sitting on the sequence's
  // final frame.
  const duration = lastFrame + rate.timebase;

  const markerXml = markers
    .map((m, i) => {
      const name = colorLabels ? `[${COLOR_LABEL[m.color]}] ${m.label}` : m.label;
      return [
        "\t\t<marker>",
        `\t\t\t<comment>${escapeXml(m.note ?? "")}</comment>`,
        `\t\t\t<name>${escapeXml(name)}</name>`,
        `\t\t\t<in>${frames[i]}</in>`,
        "\t\t\t<out>-1</out>",
        "\t\t</marker>",
      ].join("\n");
    })
    .join("\n");

  const rateXml = (indent: string) =>
    `${indent}<rate>\n${indent}\t<timebase>${rate.timebase}</timebase>\n${indent}\t<ntsc>${
      rate.ntsc ? "TRUE" : "FALSE"
    }</ntsc>\n${indent}</rate>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
\t<sequence id="sequence-1">
\t\t<uuid>${crypto.randomUUID()}</uuid>
\t\t<duration>${duration}</duration>
${rateXml("\t\t")}
\t\t<name>${escapeXml(sequenceName)}</name>
\t\t<media>
\t\t</media>
\t\t<timecode>
${rateXml("\t\t\t")}
\t\t\t<string>00:00:00:00</string>
\t\t\t<frame>0</frame>
\t\t\t<displayformat>NDF</displayformat>
\t\t</timecode>
${markerXml}
\t</sequence>
</xmeml>
`;
}
