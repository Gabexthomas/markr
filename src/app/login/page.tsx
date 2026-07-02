"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function sendMagicLink() {
    if (!email) {
      setStatus("error");
      setErrorMessage("Enter your email first.");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("signInWithOtp returned an error:", error);
        setStatus("error");
        if (error.status === 429 || error.code === "over_email_send_rate_limit") {
          setErrorMessage(
            "You're requesting links too fast. Wait a minute or two, then try again."
          );
        } else {
          setErrorMessage(error.message || "Something went wrong sending the link.");
        }
        return;
      }

      setStatus("sent");
    } catch (err) {
      // Covers thrown exceptions: no network connection, blocked cookies,
      // CORS failures, etc. — signInWithOtp doesn't always resolve with an
      // { error } object for these, it can reject instead.
      console.error("signInWithOtp threw:", err);
      setStatus("error");
      setErrorMessage(
        "Couldn't reach the server. Check your connection and try again."
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="h-12 w-12 rounded-full bg-red-500" />
        <h1 className="text-2xl font-semibold">Markr</h1>
        <p className="max-w-xs text-sm text-neutral-400">
          Sign in with your email — we&apos;ll send you a magic link, no password needed.
        </p>
      </div>

      {status === "sent" ? (
        <p className="max-w-xs text-center text-sm text-green-400">
          Check your inbox at <span className="font-medium">{email}</span> for a sign-in link.
        </p>
      ) : (
        // type="button" + explicit onClick instead of a form submit event:
        // avoids any chance of a native form submission (full page reload,
        // wiping component state) if the tap ever races ahead of JS hydration.
        <div className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            enterKeyHint="send"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMagicLink();
              }
            }}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-base text-foreground placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={status === "sending"}
            className="rounded-lg bg-red-500 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {status === "sending" ? "Sending link..." : "Send magic link"}
          </button>
          {status === "error" && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}
        </div>
      )}
    </main>
  );
}
