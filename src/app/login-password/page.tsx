"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "error";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M9.9 4.24A9.13 9.13 0 0 1 12 4c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.53 13.53 0 0 0 1 11s4 7 11 7a9.16 9.16 0 0 0 5.39-1.61M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  onEnter,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 pr-11 text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-400 hover:text-neutral-200"
        >
          <EyeIcon open={visible} />
        </button>
      </div>
    </div>
  );
}

export default function LoginPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");

  async function handleSubmit() {
    if (!email || !password) {
      setStatus("error");
      setFormError("Enter your email and password.");
      return;
    }

    setStatus("submitting");
    setFormError("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setStatus("error");
        console.error("signInWithPassword returned an error:", error);
        if (error.code === "email_not_confirmed") {
          setFormError("Please verify your email before logging in.");
        } else if (error.code === "invalid_credentials") {
          setFormError("Invalid email or password.");
        } else {
          setFormError("Something went wrong, try again.");
        }
        return;
      }

      if (data.session) {
        router.replace("/");
      }
    } catch (err) {
      // Covers thrown exceptions: no network connection, blocked cookies,
      // CORS failures, etc. — signInWithPassword doesn't always resolve
      // with an { error } object for these, it can reject instead.
      console.error("signInWithPassword threw:", err);
      setStatus("error");
      setFormError("Something went wrong, try again.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-12 w-12 rounded-full bg-red-500" />
        <h1 className="text-2xl font-semibold">Markr</h1>
        <p className="max-w-xs text-sm text-neutral-400">
          Log in with your email and password.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="sr-only">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          onEnter={handleSubmit}
        />

        <a
          href="/forgot-password"
          className="self-end text-sm text-neutral-400 underline-offset-2 hover:text-neutral-200 hover:underline"
        >
          Forgot password?
        </a>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "submitting"}
          className="rounded-lg bg-red-500 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {status === "submitting" ? "Logging in..." : "Log in"}
        </button>
        {status === "error" && formError && (
          <p className="text-sm text-red-400">{formError}</p>
        )}
      </div>
    </main>
  );
}
