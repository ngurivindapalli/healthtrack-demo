"use client";

type AuthResult = { error: { message: string } | null };

async function postAuth(path: string, body: Record<string, unknown>): Promise<AuthResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return { error: null };
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  return { error: { message: payload?.message || "Request failed." } };
}

export const authClient = {
  signIn: {
    email: (input: { email: string; password: string }) =>
      postAuth("/api/auth/sign-in/email", input),
    socialUrl: (input: { provider: "google"; callbackURL: string }) =>
      `/api/auth/sign-in/social?provider=${input.provider}&callbackURL=${encodeURIComponent(input.callbackURL)}`,
  },
  signUp: {
    email: (input: { email: string; password: string; name: string }) =>
      postAuth("/api/auth/sign-up/email", input),
  },
  requestPasswordReset: (input: { email: string; redirectTo: string }) =>
    postAuth("/api/auth/request-password-reset", input),
  resetPassword: (input: { newPassword: string; token: string }) =>
    postAuth("/api/auth/reset-password", input),
  signOut: () => postAuth("/api/auth/sign-out", {}),
};
