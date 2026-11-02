"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { refreshWorkspace } from "@/lib/store";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [google, setGoogle] = useState(false);
  const [emailDelivery, setEmailDelivery] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/config")
      .then((response) => response.json())
      .then((body: { googleSignIn?: boolean; emailDelivery?: boolean }) => {
        setGoogle(Boolean(body.googleSignIn));
        setEmailDelivery(Boolean(body.emailDelivery));
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent) {
      setError("Consent is required before HealthTrack stores a profile.");
      return;
    }
    setPending(true);
    setError("");
    const result = await authClient.signUp.email({ email, password, name });
    if (result.error) {
      setPending(false);
      setError(result.error.message || "Could not create the account.");
      return;
    }
    await refreshWorkspace();
    router.push("/onboarding");
  }

  return (
    <div className="min-h-full bg-paper px-4 py-10">
      <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-md space-y-4">
        <p className="display text-2xl text-pine">Create account</p>
        <Card className="space-y-3">
          <Field label="Name">
            <TextInput required value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <label className="flex items-start gap-2 text-sm leading-6 text-ink-soft">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>
              I agree to store my profile and health measurements for this account. Read the{" "}
              <Link href="/privacy" className="underline">privacy notice</Link>.
            </span>
          </label>
          {emailDelivery ? (
            <p className="text-xs text-muted">Account creation asks the email provider to send a verification message. This page cannot confirm that the message arrived.</p>
          ) : (
            <p className="text-xs text-muted">Email delivery is not configured, so this server will not send a verification message.</p>
          )}
          {error ? <p className="text-sm text-attention">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
          {google ? (
            <a
              href={authClient.signIn.socialUrl({ provider: "google", callbackURL: "/onboarding" })}
              className="inline-flex w-full items-center justify-center rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-ink hairline hover:bg-paper-2"
            >
              Continue with Google
            </a>
          ) : null}
        </Card>
        <p className="text-sm text-muted">
          Already have an account? <Link href="/sign-in" className="underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
