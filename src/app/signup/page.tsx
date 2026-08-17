"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "submitting" | "sent" | "exists" | "error";

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function joinWithAnd(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function validate(email: string, password: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else {
    const issues: string[] = [];
    if (password.length < 8) issues.push("be at least 8 characters");
    if (!/[A-Za-z]/.test(password)) issues.push("include a letter");
    if (!/[0-9]/.test(password)) issues.push("include a number");
    if (issues.length > 0) {
      errors.password = `Password must ${joinWithAnd(issues)}.`;
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords don't match.";
  }

  return errors;
}

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
  error,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  error?: string;
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
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");

  async function handleSubmit() {
    const validationErrors = validate(email, password, confirmPassword);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    setFormError("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus("error");
        if (error.status === 429 || error.code === "over_email_send_rate_limit") {
          setFormError("You're signing up too fast. Wait a minute or two, then try again.");
        } else if (
          error.code === "user_already_exists" ||
          error.message.toLowerCase().includes("already registered")
        ) {
          setStatus("exists");
        } else {
          setFormError(error.message || "Something went wrong creating your account.");
        }
        return;
      }

      // Supabase returns success (no error) even when the email already
      // belongs to a confirmed account, to avoid leaking which emails are
      // registered. The documented signal for this is an empty
      // `identities` array on the returned user.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setStatus("exists");
        return;
      }

      setStatus("sent");
    } catch (err) {
      // Covers thrown exceptions: no network connection, blocked cookies,
      // CORS failures, etc. — signUp doesn't always resolve with an
      // { error } object for these, it can reject instead.
      console.error("signUp threw:", err);
      setStatus("error");
      setFormError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  if (status === "sent") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-red-500" />
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="max-w-xs text-sm text-neutral-400">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click it to activate
          your account, then come back here to log in.
        </p>
      </main>
    );
  }

  if (status === "exists") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-red-500" />
        <h1 className="text-2xl font-semibold">Account already exists</h1>
        <p className="max-w-xs text-sm text-neutral-400">
          There&apos;s already an account for{" "}
          <span className="font-medium text-foreground">{email}</span>. Try logging in instead.
        </p>
        <a
          href="/login"
          className="rounded-lg bg-red-500 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-red-600"
        >
          Go to login
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-12 w-12 rounded-full bg-red-500" />
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="max-w-xs text-sm text-neutral-400">
          Sign up with an email and password. We&apos;ll send a confirmation link before you can
          log in.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="signup-email" className="sr-only">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
        </div>

        <PasswordField
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          onEnter={handleSubmit}
          error={errors.password}
        />

        <PasswordField
          id="signup-confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            if (errors.confirmPassword)
              setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          onEnter={handleSubmit}
          error={errors.confirmPassword}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "submitting"}
          className="rounded-lg bg-red-500 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          {status === "submitting" ? "Creating account..." : "Sign up"}
        </button>
        {status === "error" && formError && (
          <p className="text-sm text-red-400">{formError}</p>
        )}
      </div>
    </main>
  );
}
