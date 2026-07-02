import type { ButtonColor } from "@/lib/supabase/types";

export interface LocalMarker {
  id: string;
  session_id: string;
  button_id: string | null;
  label: string;
  color: ButtonColor;
  tapped_at: string;
  note: string | null;
  deleted: boolean;
  synced: boolean;
}

export interface LocalSession {
  id: string;
  show_id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  offset_seconds: number;
  synced: boolean;
}

export interface LocalSessionState {
  session: LocalSession;
  markers: LocalMarker[];
}
