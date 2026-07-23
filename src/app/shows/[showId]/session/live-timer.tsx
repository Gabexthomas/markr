"use client";

import { useEffect, useState } from "react";
import { formatElapsed } from "@/lib/format-timecode";

// Isolated so its once-a-second tick only re-renders this span — not the
// marker button grid, the tap badges, the session log, or anything else on
// the live session screen. Cosmetic only: recomputed from startedAt on every
// tick, never accumulated, so a locked phone can't drift the display.
export function LiveTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    function tick() {
      setNow(Date.now());
    }
    tick();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, 1000);
    function handleVisible() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [startedAt]);

  const elapsedMs = now - new Date(startedAt).getTime();
  return <span className="font-mono text-lg tabular-nums">{formatElapsed(elapsedMs)}</span>;
}
