export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="h-16 w-16 rounded-full bg-red-500" />
      <h1 className="text-3xl font-semibold">Markr</h1>
      <p className="max-w-sm text-sm text-neutral-400">
        Live timecode markers for podcast producers. Phase 1 scaffold —
        shows, buttons, sessions, and exports are coming next.
      </p>
    </main>
  );
}
