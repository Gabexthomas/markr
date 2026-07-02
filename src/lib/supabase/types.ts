// Hand-written types matching the SQL schema in supabase/migrations.
// If the schema changes, update this file to match.

export type Plan = "free" | "pro";
export type ButtonColor =
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "gray";
export type ButtonType = "marker" | "segment";
export type Fps = 23.976 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          plan: Plan;
          created_at: string;
        };
        Insert: {
          id: string;
          plan?: Plan;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan?: Plan;
          created_at?: string;
        };
        Relationships: [];
      };
      shows: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          fps: Fps;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          fps?: Fps;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          fps?: Fps;
          created_at?: string;
        };
        Relationships: [];
      };
      buttons: {
        Row: {
          id: string;
          show_id: string;
          label: string;
          color: ButtonColor;
          icon: string | null;
          sort_order: number;
          type: ButtonType;
          created_at: string;
        };
        Insert: {
          id?: string;
          show_id: string;
          label: string;
          color: ButtonColor;
          icon?: string | null;
          sort_order?: number;
          type?: ButtonType;
          created_at?: string;
        };
        Update: {
          id?: string;
          show_id?: string;
          label?: string;
          color?: ButtonColor;
          icon?: string | null;
          sort_order?: number;
          type?: ButtonType;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          show_id: string;
          title: string;
          started_at: string;
          ended_at: string | null;
          offset_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          show_id: string;
          title: string;
          started_at: string;
          ended_at?: string | null;
          offset_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          show_id?: string;
          title?: string;
          started_at?: string;
          ended_at?: string | null;
          offset_seconds?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      markers: {
        Row: {
          id: string;
          session_id: string;
          button_id: string | null;
          label: string;
          color: ButtonColor;
          tapped_at: string;
          note: string | null;
          deleted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          button_id?: string | null;
          label: string;
          color: ButtonColor;
          tapped_at: string;
          note?: string | null;
          deleted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          button_id?: string | null;
          label?: string;
          color?: ButtonColor;
          tapped_at?: string;
          note?: string | null;
          deleted?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
