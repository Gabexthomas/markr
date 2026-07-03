import type { Fps } from "@/lib/supabase/types";

// NTSC-family rates are represented in FCP7 XML as their rounded nominal
// timebase plus an ntsc flag (23.976 -> 24/TRUE, 29.97 -> 30/TRUE, etc.) —
// there's no such thing as a fractional <timebase>. Frame counts are always
// computed against the rounded integer rate, matching non-drop-frame
// (NDF) counting, which is what we use for displayformat throughout.
const NTSC_RATES: Fps[] = [23.976, 29.97, 59.94];

export interface RateInfo {
  timebase: number;
  ntsc: boolean;
}

export function rateInfoForFps(fps: Fps): RateInfo {
  return {
    timebase: Math.round(fps),
    ntsc: NTSC_RATES.includes(fps),
  };
}

export function secondsToFrames(seconds: number, fps: Fps): number {
  return Math.max(0, Math.round(seconds * Math.round(fps)));
}

export function framesToTimecode(frames: number, fps: Fps): string {
  const rate = Math.round(fps);
  const total = Math.max(0, Math.round(frames));
  const hh = Math.floor(total / (3600 * rate));
  const mm = Math.floor((total % (3600 * rate)) / (60 * rate));
  const ss = Math.floor((total % (60 * rate)) / rate);
  const ff = total % rate;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}
