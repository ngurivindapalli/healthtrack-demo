"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailDelivery, setEmailDelivery] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/v1/config")
      .then((response) => response.json())
      .then((body: { emailDelivery?: boolean }) => setEmailDelivery(Boolean(body.emailDelivery)))
      .catch(() => setEmailDelivery(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!emailDelivery) {
      setError("Password reset email is unavailable until email delivery is configured.");
      return;
    }
    setPending(true);
    setError("");
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Could not start a password reset.");
      return;
    }
    setMessage("If an account exists, the server asked the email provider to send a reset link that expires in one hour. This page cannot confirm that the message arrived.");
  }

  return (
    <div className="min-h-full bg-paper px-4 py-10">
      <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-md space-y-4">
        <p className="display text-2xl text-pine">Reset password</p>
        <Card className="space-y-3">
          {emailDelivery === false ? (
            <p className="text-sm text-ink-soft">
              Email delivery is not configured on this server, so a reset link cannot be sent.
            </p>
          ) : null}
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          {error ? <p className="text-sm text-attention">{error}</p> : null}
          {message ? <p className="text-sm text-pine">{message}</p> : null}
          <Button type="submit" className="w-full" disabled={pending || emailDelivery === false}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </Card>
        <Link href="/sign-in" className="text-sm underline">Back to sign in</Link>
      </form>
    </div>
  );
}
