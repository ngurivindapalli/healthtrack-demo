export function assertProductionDatabase(url: string, env: NodeJS.ProcessEnv = process.env): void {
  const runtime = env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
  if (!runtime) return;
  const ephemeral = env.VERCEL === "1" || Boolean(env.AWS_LAMBDA_FUNCTION_NAME);
  if (ephemeral && (!url || url.startsWith("file:"))) {
    throw new Error("DATABASE_URL must be a hosted libSQL URL on ephemeral hosting. A file database would be discarded when the instance stops.");
  }
  if (runtime && url.startsWith("libsql:") && !env.DATABASE_AUTH_TOKEN) {
    throw new Error("DATABASE_AUTH_TOKEN is required for a hosted libSQL database");
  }
}

export function assertProductionAuth(env: NodeJS.ProcessEnv = process.env): void {
  const runtime = env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
  if (!runtime) return;
  if (!env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is required in production");
  const url = env.BETTER_AUTH_URL ?? "";
  if (!url.startsWith("https://")) throw new Error("BETTER_AUTH_URL must be an https URL in production");
}
