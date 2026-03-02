"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PortalLoginPage() {
  const router = useRouter();
  const params = useParams<{ firmSlug: string }>();
  const firmSlug = params.firmSlug;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firmSlug,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Login failed");
        return;
      }

      router.push(`/portal/${firmSlug}`);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto w-full max-w-md rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold">Portal Login</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in with your portal email and password.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-medium text-muted-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </main>
  );
}
