"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }
    setPending(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) {
      setError(result.error.message || "Could not reset the password.");
      return;
    }
    router.push("/sign-in");
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-md space-y-4">
      <p className="display text-2xl text-pine">Choose a new password</p>
      <Card className="space-y-3">
        <Field label="New password">
          <TextInput type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-attention">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </Card>
      <Link href="/sign-in" className="text-sm underline">Back to sign in</Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-full bg-paper px-4 py-10">
      <Suspense fallback={<p className="px-6 text-sm text-muted">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
