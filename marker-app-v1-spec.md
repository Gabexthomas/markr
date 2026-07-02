# Marker App — V1 Build Spec

A live timecode marker tool for podcast producers. The producer taps buttons on their phone while the show records; the editor gets a file that puts every marker straight onto their Premiere Pro timeline.

Working name: TBD (placeholder: "Markr")

## Who it's for

Podcast producers and self-producing hosts. During recording they currently note timecodes by hand in Google Docs/Sheets. This replaces that with one-tap markers and professional exports.

## Core principle

**Never lose a marker.** Everything is designed around reliability during a live recording: offline-first, timestamp-based timing (no running timers), instant tap feedback.

## Stack

- Next.js (App Router) + TypeScript
- Supabase: auth (magic link email), Postgres, row-level security
- Tailwind CSS
- Deployed on Vercel
- PWA: manifest + service worker so it installs to home screen and works offline during a session

## How timing works (critical)

There is NO running timer/interval driving state.

1. When the user taps **Start**, store `session.started_at` = current UTC timestamp (ms precision). Save to localStorage immediately, then sync to Supabase.
2. Every marker tap stores `marker.tapped_at` = current UTC timestamp.
3. Elapsed timecode is always computed: `tapped_at - started_at`.
4. The on-screen timer display is cosmetic — recomputed from `started_at` whenever the app is visible (requestAnimationFrame or 1s interval while visible). App being closed/locked has zero effect on accuracy.
5. Sessions support an **offset adjustment** (+/- seconds) applied at export time, for when the producer hit Start late relative to the recorder. Editing the offset shifts all markers.

## Offline-first behaviour

- All session state (session, markers, notes) writes to localStorage synchronously on every action.
- A sync queue pushes changes to Supabase when online; retries on reconnect.
- If the app loads and finds an unsynced session in localStorage, restore it seamlessly.
- The session screen must be fully functional with no network.

## Data model

```
users (Supabase auth)

shows
  id, user_id, name, fps (default 25; options 23.976/24/25/29.97/30/50/59.94/60)

buttons
  id, show_id, label, color (one of 8 preset colors), icon (optional), sort_order, type ('marker' | 'segment')
  -- 'segment' buttons feed YouTube chapters; 'marker' buttons are edit/clip/etc.

sessions
  id, show_id, title (default: date), started_at (timestamptz), ended_at, offset_seconds (default 0), created_at

markers
  id, session_id, button_id (nullable), label (denormalised copy), color, tapped_at (timestamptz), note (text), deleted (bool)
```

Denormalise label/color onto markers so editing a show's buttons later doesn't rewrite history.

## Screens

### 1. Shows list
- List of user's shows, create show (name + fps).

### 2. Show setup / button grid editor
- Add/edit/reorder buttons: label, color (8 presets), type (marker/segment).
- Seed new shows with defaults: Edit Point (red), Clip/Reel (purple), Sponsor Read (amber), Mistake/Cough (gray) as markers; plus prompt to add segments.

### 3. Live session (the main screen — mobile-first, big tap targets)
- Big Start button → creates session, stores started_at.
- Running timecode display (H:MM:SS), subtle recording indicator.
- Grid of the show's buttons (min 64px tap targets). Tap = drop marker at current elapsed. Instant visual feedback (scale press + brief highlight) and haptic via navigator.vibrate where supported.
- Text field: "add note to last marker" (attaches to most recent marker). Keep typing optional.
- Collapsible session log: recent markers with timecode, label pill (colored), note. Tap a row to edit note or delete marker.
- End session button (with confirm).
- Must work one-handed on a phone sitting next to an ATEM.

### 4. Session review (after ending, also reachable from history)
- Full marker list, editable: notes, delete, adjust individual timecode by +/- seconds.
- Session offset control ("we hit start 20s late" → shift all markers).
- Export buttons (below).

### 5. Session history per show
- Past sessions, tap into review.

## Exports (V1)

All generated client-side or via a simple API route; downloaded as files (and share-sheet on mobile via Web Share API where possible).

1. **Premiere Pro XML** (FCP7 xmeml v4): a sequence named after the session with all markers as sequence markers (name, comment=note, in=frames computed from elapsed × show fps). Respect fps setting and offset. This is the hero export — must import cleanly into Premiere via File → Import.
2. **CSV**: Marker Name, Description, In, Out, Duration, Marker Type — matching Premiere's own marker CSV layout.
3. **YouTube chapters**: plain text, `0:00 Intro` style, built from 'segment'-type markers only, first line forced to 0:00.
4. **Clip sheet**: plain text/markdown list of all Clip/Reel-type markers with timecodes and notes, ready to paste to a shorts editor.

Marker names in XML get their color name prefixed if the user enables "color labels in export" (e.g. "[RED] Edit Point") since the XML format can't carry real colors.

## Auth & plans (V1 keeps it simple)

- Magic-link email auth via Supabase.
- No payments in V1. Build the `plan` column on users now (free/pro) but everything is free during trial. Stripe comes in V1.1 once validated.

## Non-goals for V1 (do not build yet)

- Premiere panel/extension (V2)
- Resolve EDL export (V1.1)
- Teams / multiple users per show
- AI anything
- Native app store apps

## Design notes

- Mobile-first. The live session screen is the product.
- Dark theme by default (producers work in dim studios).
- Big, unmissable tap targets; zero required typing during a session.
- Fast: taps must feel instant (optimistic UI, localStorage write, background sync).

## Definition of done for V1

Gabe can: create the DBW show with custom segment buttons on his phone, hit Start when recording begins, tap markers and add the odd note for a full 2.5 hour episode with the phone locking between taps, end the session, nudge the offset, export the Premiere XML, import it into Premiere, and see every marker at the correct timecode. Without the app losing a single tap, even if wifi drops.
