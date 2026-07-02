import type { LocalSessionState } from "./types";

// Sessions are stored one-per-key so a just-ended session can keep retrying
// its sync in the background while a new session starts immediately,
// without the two ever fighting over the same storage slot.
const SESSION_PREFIX = "markr:session:";
// A separate pointer per show tracks which session (if any) is currently
// in progress, so a reload can restore it without guessing.
const ACTIVE_PREFIX = "markr:active-session:";

function sessionKey(sessionId: string) {
  return `${SESSION_PREFIX}${sessionId}`;
}

function activeKey(showId: string) {
  return `${ACTIVE_PREFIX}${showId}`;
}

export function getActiveSessionId(showId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(activeKey(showId));
}

export function setActiveSessionId(showId: string, sessionId: string | null) {
  if (typeof window === "undefined") return;
  if (sessionId) {
    window.localStorage.setItem(activeKey(showId), sessionId);
  } else {
    window.localStorage.removeItem(activeKey(showId));
  }
}

export function loadSession(sessionId: string): LocalSessionState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSessionState;
  } catch {
    return null;
  }
}

export function saveSession(state: LocalSessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sessionKey(state.session.id), JSON.stringify(state));
}

export function deleteSession(sessionId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(sessionKey(sessionId));
}

export function listAllSessionIds(): string[] {
  if (typeof window === "undefined") return [];
  const ids: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(SESSION_PREFIX)) ids.push(key.slice(SESSION_PREFIX.length));
  }
  return ids;
}

export function isFullySynced(state: LocalSessionState): boolean {
  return state.session.synced && state.markers.every((m) => m.synced);
}
