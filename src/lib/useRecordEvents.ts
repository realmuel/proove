"use client";

import { useEffect, useRef } from "react";
import type { RecordEvent } from "@/lib/events";

/* A stable per-tab id, used to tag writes so a client can ignore the echo of
   its own change coming back over SSE. */
let CLIENT_ID: string | null = null;
export function clientId(): string {
  if (CLIENT_ID) return CLIENT_ID;
  CLIENT_ID =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return CLIENT_ID;
}

/* Subscribe to realtime changes for a record. `channel` is "recipe:<id>" or
   "meal:<id>"; pass null to disable. Events originating from this same tab are
   filtered out. */
export function useRecordEvents(
  channel: string | null,
  onChange: (event: RecordEvent) => void
) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!channel) return;
    const source = new EventSource(
      `/api/events?channel=${encodeURIComponent(channel)}`
    );

    source.addEventListener("change", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as RecordEvent;
        if (data.origin && data.origin === clientId()) return; // ignore own echo
        cb.current(data);
      } catch {
        /* ignore malformed payloads */
      }
    });

    return () => source.close();
  }, [channel]);
}
