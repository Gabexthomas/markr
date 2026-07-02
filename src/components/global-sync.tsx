"use client";

import { useEffect } from "react";
import { syncAllPendingSessions } from "@/lib/offline/sync";

// Sweeps localStorage for any session/marker data that hasn't made it to
// Supabase yet and retries it — on load, when the network comes back, and
// whenever the tab becomes visible again. This is what guarantees a marker
// recorded on one visit to the session screen still gets synced even if the
// user closes the tab before it finishes.
export function GlobalSync() {
  useEffect(() => {
    void syncAllPendingSessions();

    function handleOnline() {
      void syncAllPendingSessions();
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") void syncAllPendingSessions();
    }

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
