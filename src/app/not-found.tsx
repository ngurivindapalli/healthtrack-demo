import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="display text-3xl text-pine">HealthTrack</p>
      <h1 className="mt-4 text-xl font-semibold">This screen is not in the demo</h1>
      <p className="mt-2 max-w-md text-sm text-ink-soft">
        The 1.0 product surfaces are Today, Trends, Progress, Profile, and the Health Coach.
      </p>
      <Link
        href="/today"
        className="mt-6 rounded-full bg-pine px-4 py-2 text-sm font-medium text-surface"
      >
        Go to Today
      </Link>
    </div>
  );
}
