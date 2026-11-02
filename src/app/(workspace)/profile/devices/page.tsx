"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

function remainingLabel(expiresAt: string, now: number) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "Expired";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")} left`;
}

export default function DevicesPage() {
  const { state, createPairingCode, revokeDevice } = useDemo();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const devices = state.devices ?? [];
  const active = devices.filter((device) => device.status === "active");
  const expired = Boolean(code && expiresAt && new Date(expiresAt).getTime() <= now);

  useEffect(() => {
    if (!expiresAt || expired) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, expired]);

  async function pair(replace: boolean) {
    if (replace && !window.confirm("Replace the current code? The previous unused code will stop working.")) return;
    setPending(true);
    setError("");
    setNotice("");
    const result = await createPairingCode();
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setCode(result.code);
    setExpiresAt(result.expiresAt);
    setNow(Date.now());
    setNotice("Waiting for the companion app. This page will not show a device until the server accepts the code.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Eyebrow>Devices & data sources</Eyebrow>
        <h1 className="display mt-1 text-3xl">Connect your mobile app</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          The companion app is not available in this build. When it ships, enter this code there. HealthTrack lists an installation only after that app completes pairing.
        </p>
      </header>

      <Card>
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-sleep" aria-hidden />
          <div>
            <p className="font-semibold">{active.length === 0 ? "No app is connected" : "Connected installations"}</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              A pairing code lasts 10 minutes and can be used once. Creating a new code cancels the previous unused code. Disconnecting a device stops future uploads and keeps measurements already stored.
            </p>
          </div>
        </div>
        {active.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {active.map((device) => (
              <li key={device.id} className="rounded-xl bg-paper px-3 py-3">
                <p className="text-sm font-semibold">{device.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {device.platform} · {device.status} · {device.categories.join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Last successful sync: {device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString() : "No measurements yet"}
                </p>
                <Button className="mt-3" variant="secondary" onClick={() => void revokeDevice(device.id)}>
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {!code || expired ? (
            <Button onClick={() => void pair(false)} disabled={pending}>
              {pending ? "Creating code…" : "Create pairing code"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => void pair(true)} disabled={pending}>
              {pending ? "Replacing…" : "Replace unused code"}
            </Button>
          )}
        </div>
      </Card>

      {code && expiresAt ? (
        <Card>
          <p className="text-sm text-muted">{expired ? "This code expired" : "Pairing code"}</p>
          <p className="mt-2 font-mono text-3xl tracking-[0.28em] text-ink" aria-live="polite">
            {expired ? "--------" : `${code.slice(0, 4)} ${code.slice(4)}`}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            {expired
              ? "Create a new code. The expired one cannot be used."
              : `${remainingLabel(expiresAt, now)}. Enter the eight characters in the companion app, without the space.`}
          </p>
          {!expired ? (
            <Button
              className="mt-3"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(code).then(
                  () => setNotice("Code copied."),
                  () => setError("Could not copy the code. Enter it from the screen."),
                );
              }}
            >
              Copy code
            </Button>
          ) : null}
        </Card>
      ) : null}
      {notice ? <p className="text-sm text-ink-soft" role="status">{notice}</p> : null}
      {error ? <p className="text-sm text-attention" role="alert">{error}</p> : null}

      <Card>
        <h2 className="text-base font-semibold">What to do in the mobile app</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-ink-soft">
          <li>Open the companion app after it is released. It is not available from this website.</li>
          <li>Choose connect and enter the code before it expires.</li>
          <li>Return here. A connected installation appears only after the server accepts the code.</li>
          <li>If the app says the code is invalid, create a new one. Do not reuse an expired code.</li>
        </ol>
      </Card>
    </div>
  );
}
