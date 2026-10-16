"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui";

export function DeclinePrompt({
  onDecline,
}: {
  onDecline: (reason: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Decline
      </Button>
    );
  }

  return (
    <form
      className="flex w-full flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onDecline(reason.trim() || "Not feasible today");
      }}
    >
      <label className="sr-only" htmlFor={id}>
        Why this isn’t feasible
      </label>
      <input
        id={id}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Why isn’t this feasible?"
        className="min-w-48 flex-1 rounded-full border border-line bg-surface px-3 py-2 text-sm"
      />
      <Button type="submit" variant="ghost">
        Save decline
      </Button>
    </form>
  );
}
