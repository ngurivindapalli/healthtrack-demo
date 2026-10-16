export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="h-8 w-48 rounded-lg bg-paper-2" />
      <div className="h-40 rounded-2xl bg-paper-2" />
      <div className="h-32 rounded-2xl bg-paper-2" />
      <p className="text-sm text-muted">Loading HealthTrack…</p>
    </div>
  );
}
