"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/links";
import { refreshWorkspace } from "@/lib/store";

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [google, setGoogle] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/config")
      .then((response) => response.json())
      .then((body: { googleSignIn?: boolean }) => setGoogle(Boolean(body.googleSignIn)))
      .catch(() => setGoogle(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setPending(false);
      setError(result.error.message || "Sign-in failed.");
      return;
    }
    await refreshWorkspace();
    router.push(next);
  }

  return (
    <div className="min-h-full bg-paper px-4 py-10">
      <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-md space-y-4">
        <p className="display text-2xl text-pine">Sign in</p>
        <Card className="space-y-3">
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error ? <p className="text-sm text-attention">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          {google ? (
            <a
              href={authClient.signIn.socialUrl({ provider: "google", callbackURL: "/today" })}
              className="inline-flex w-full items-center justify-center rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-ink hairline hover:bg-paper-2"
            >
              Continue with Google
            </a>
          ) : null}
        </Card>
        <p className="text-sm text-muted">
          <Link href="/forgot-password" className="underline">Forgot password</Link>
          {" · "}
          <Link href="/sign-up" className="underline">Create account</Link>
        </p>
      </form>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-sm text-muted">Loading sign-in…</p>}>
      <SignInForm />
    </Suspense>
  );
}
