"use client";

import { memo, useState } from "react";
import type { ButtonColor, ButtonType } from "@/lib/supabase/types";
import { BUTTON_BADGE_CLASS, BUTTON_BG_CLASS, BUTTON_RING_CLASS } from "@/lib/button-colors";

type MarkerButtonDef = {
  id: string;
  label: string;
  color: ButtonColor;
  type: ButtonType;
  sort_order: number;
};

// Tap count and ring-flash are kept as local state here (not lifted to the
// live session screen's state) so a tap only re-renders this one button and
// the toast slot, not the marker log or the timer. `initialCount` seeds the
// count from restored markers on mount (e.g. after a reload mid-session);
// every tap after that increments locally, no re-derivation needed. Keying
// this component on the session id at the call site is what resets the
// count back to zero for a new session.
function MarkerButtonImpl({
  button,
  initialCount,
  onTap,
}: {
  button: MarkerButtonDef;
  initialCount: number;
  onTap: (button: MarkerButtonDef) => void;
}) {
  const [count, setCount] = useState(initialCount);
  const [flashSeq, setFlashSeq] = useState(0);

  function handleClick() {
    setCount((c) => c + 1);
    setFlashSeq((s) => s + 1);
    onTap(button);
  }

  return (
    <button
      onClick={handleClick}
      className={`relative min-h-16 touch-manipulation rounded-xl px-3 py-4 text-base font-semibold text-white shadow transition-transform duration-75 active:scale-[0.92] ${BUTTON_BG_CLASS[button.color]}`}
    >
      {flashSeq > 0 && (
        <span
          key={flashSeq}
          aria-hidden
          className={`marker-ring-flash pointer-events-none absolute -inset-1 rounded-xl border-4 ${BUTTON_RING_CLASS[button.color]}`}
        />
      )}
      {count > 0 && (
        <span
          className={`absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold text-white ${BUTTON_BADGE_CLASS[button.color]}`}
        >
          {count}
        </span>
      )}
      {button.label}
    </button>
  );
}

export const MarkerButton = memo(MarkerButtonImpl);
