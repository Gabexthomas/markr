import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

// The React-blessed way to know "we're past hydration" without an effect —
// getServerSnapshot returns false so SSR and the first client render agree,
// getSnapshot returns true for every client render after that. Used to gate
// any UI that reads localStorage so it never mismatches the server render.
export function useIsHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}
