import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (static files)
     * - favicon, manifest, icons, sw.js (PWA assets)
     */
    "/((?!_next/static|_next/image|manifest.json|sw.js|icons/).*)",
  ],
};
