import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

export default async function ShowsPage() {
  const supabase = await createClient();
  const { data: shows } = await supabase
    .from("shows")
    .select("id, name, fps")
    .order("created_at", { ascending: false });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Your shows" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link
          href="/shows/new"
          className="flex items-center justify-center rounded-lg bg-red-500 px-4 py-4 text-base font-medium text-white transition-colors hover:bg-red-600"
        >
          + New show
        </Link>

        {!shows || shows.length === 0 ? (
          <p className="mt-8 text-center text-sm text-neutral-500">
            No shows yet. Create one to set up buttons and start recording sessions.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shows.map((show) => (
              <li key={show.id}>
                <Link
                  href={`/shows/${show.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-4 transition-colors hover:border-neutral-600"
                >
                  <span className="text-base font-medium">{show.name}</span>
                  <span className="text-sm text-neutral-500">{show.fps} fps</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
