export function assertSafeEmailLink(url: string, baseUrl: string): void {
  const base = new URL(baseUrl);
  const target = new URL(url);
  if (target.origin !== base.origin) throw new Error("The email link origin is not allowed.");
  for (const name of ["callbackURL", "redirectTo"]) {
    const callback = target.searchParams.get(name);
    if (!callback) continue;
    const next = new URL(callback, base);
    if (next.origin !== base.origin) throw new Error("The email link origin is not allowed.");
  }
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return "/today";
  return value;
}
