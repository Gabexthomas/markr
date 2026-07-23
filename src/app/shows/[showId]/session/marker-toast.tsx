"use client";

import { forwardRef, useImperativeHandle, useState } from "react";

export type MarkerToastHandle = {
  show: (text: string) => void;
};

// Holds its own show/hide state so triggering a toast doesn't touch the
// live session screen's state at all — a tap re-renders this slot and
// nothing else upstream. Keying the pill on an incrementing id forces a
// fresh mount (and a fresh animation) on every show(), which is what makes
// a rapid re-tap replace the toast cleanly instead of stacking or queuing.
export const MarkerToast = forwardRef<MarkerToastHandle>(function MarkerToast(_props, ref) {
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useImperativeHandle(ref, () => ({
    show(text: string) {
      setToast((cur) => ({ id: (cur?.id ?? 0) + 1, text }));
    },
  }));

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      <span
        key={toast.id}
        onAnimationEnd={() => setToast(null)}
        className="marker-toast-flash rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg"
      >
        {toast.text}
      </span>
    </div>
  );
});
