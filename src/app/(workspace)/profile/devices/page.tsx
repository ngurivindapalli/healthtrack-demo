"use client";

import Link from "next/link";
import { Button, Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function DevicesPage() {
  const { state, toggleSource } = useDemo();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/profile" className="text-sm text-pine hover:underline">
        ← Profile
      </Link>
      <header>
        <Eyebrow>Hardware-neutral</Eyebrow>
        <h1 className="display mt-1 text-3xl">Data sources</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Junction wearable connections are simulated. Pulse Watch is the interactive ingest path — connecting here does not call a vendor. Coverage numbers are sample data.
        </p>
      </header>
      <Link href="/watch">
        <Card className="hover:bg-paper">
          <p className="font-semibold">Pulse Watch</p>
          <p className="mt-1 text-sm text-ink-soft">
            Connect, sync, and import sleep / recovery / activity into the shared store.
          </p>
        </Card>
      </Link>
      <div className="space-y-3">
        {state.sources
          .filter((source) => source.kind !== "watch")
          .map((source) => (
          <Card key={source.kind}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{source.label}</p>
                <p className="mt-1 text-sm text-ink-soft">{source.permissions.join(" · ")}</p>
                <p className="mt-1 text-xs text-muted">
                  {source.connected
                    ? `Last simulated sync ${source.lastSync} · coverage ${Math.round((source.coverage30d ?? 0) * 100)}%`
                    : "Not connected"}
                </p>
              </div>
              <Button variant={source.connected ? "secondary" : "primary"} onClick={() => toggleSource(source.kind)}>
                {source.connected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
