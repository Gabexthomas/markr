import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function PageHeader({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-4">
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="shrink-0 rounded-lg p-2 -ml-2 text-neutral-400 hover:text-foreground"
            aria-label="Back"
          >
            ←
          </Link>
        )}
        <h1 className="truncate text-lg font-semibold">{title}</h1>
      </div>
      <SignOutButton />
    </header>
  );
}
