"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PageHeader } from "@/components/page-header";
import { createShowAction } from "../actions";

const FPS_OPTIONS = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-red-500 px-4 py-4 text-base font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
    >
      {pending ? "Creating..." : "Create show"}
    </button>
  );
}

export default function NewShowPage() {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="New show" backHref="/shows" />

      <form
        action={async (formData) => {
          setError("");
          try {
            await createShowAction(formData);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
          }
        }}
        className="flex flex-col gap-4 p-4"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm text-neutral-400">
            Show name
          </label>
          <input
            id="name"
            name="name"
            required
            autoFocus
            placeholder="e.g. DBW"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="fps" className="text-sm text-neutral-400">
            Frame rate
          </label>
          <select
            id="fps"
            name="fps"
            defaultValue={25}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-foreground focus:border-neutral-500 focus:outline-none"
          >
            {FPS_OPTIONS.map((fps) => (
              <option key={fps} value={fps}>
                {fps} fps
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <SubmitButton />
      </form>
    </main>
  );
}
