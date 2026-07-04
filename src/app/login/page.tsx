"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReceiptText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Field } from "@/components/ui";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo(
            "Account created. Check your email to confirm, then sign in.",
          );
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <ReceiptText size={30} strokeWidth={2.2} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">e-Invoice Reminder</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Capture receipts now. Register them at the right time.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
            }}
            className={`min-h-9 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              mode === m
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <Field label="Your name" htmlFor="name">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wing"
              autoComplete="name"
            />
          </Field>
        )}
        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.my"
            autoComplete="email"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          required
          hint={mode === "signup" ? "At least 6 characters." : undefined}
        >
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}
        {info && (
          <p
            role="status"
            className="rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-primary"
          >
            {info}
          </p>
        )}

        <Button type="submit" block disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        For Malaysia LHDN e-invoice self-registration.
      </p>
    </main>
  );
}
