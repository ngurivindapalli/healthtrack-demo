export const DEMO_COOKIE = "healthtrack-demo-session";
export const DEMO_USER = {
  id: "demo-user",
  name: "Demo User",
  email: "demo@healthtrack.example",
} as const;

export type DemoRuntime = "off" | "on" | "forbidden";

/** Demo Mode is on only when it is explicitly requested and this deployment is not production. */
export function demoRuntime(env?: { NEXT_PUBLIC_DEMO_MODE?: string; VERCEL_ENV?: string }): DemoRuntime {
  const source = env ?? process.env;
  const requested = source.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!requested) return "off";
  if (source.VERCEL_ENV === "production") return "forbidden";
  return "on";
}

export function isDemoMode(env?: { NEXT_PUBLIC_DEMO_MODE?: string; VERCEL_ENV?: string }): boolean {
  return demoRuntime(env) === "on";
}
