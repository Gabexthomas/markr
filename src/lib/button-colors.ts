import type { ButtonColor } from "@/lib/supabase/types";

export const BUTTON_BG_CLASS: Record<ButtonColor, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  gray: "bg-gray-500",
};

export const BUTTON_RING_CLASS: Record<ButtonColor, string> = {
  red: "border-red-500",
  orange: "border-orange-500",
  amber: "border-amber-500",
  green: "border-green-500",
  teal: "border-teal-500",
  blue: "border-blue-500",
  purple: "border-purple-500",
  gray: "border-gray-500",
};

export const BUTTON_BADGE_CLASS: Record<ButtonColor, string> = {
  red: "bg-red-800",
  orange: "bg-orange-800",
  amber: "bg-amber-800",
  green: "bg-green-800",
  teal: "bg-teal-800",
  blue: "bg-blue-800",
  purple: "bg-purple-800",
  gray: "bg-gray-800",
};
