/* Tiny in-process pub/sub used to push realtime updates to connected clients
   over SSE. Suitable for the app's single-node SQLite setup. Listeners are
   keyed by channel, e.g. "recipe:<id>" or "meal:<id>".

   Stored on globalThis so the registry survives module reloads in dev (HMR)
   and is shared across route handlers in the same Node process. */

export type RecordEvent = {
  type: "updated" | "deleted";
  version?: number;
  /* random id of the writer, so a client can ignore echoes of its own writes */
  origin?: string;
};

type Listener = (event: RecordEvent) => void;

const KEY = "__recipeAppEventBus__";

type Bus = { channels: Map<string, Set<Listener>> };

function bus(): Bus {
  const g = globalThis as unknown as Record<string, Bus | undefined>;
  if (!g[KEY]) g[KEY] = { channels: new Map() };
  return g[KEY]!;
}

export function subscribe(channel: string, listener: Listener): () => void {
  const { channels } = bus();
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
  }
  set.add(listener);

  return () => {
    const s = channels.get(channel);
    if (!s) return;
    s.delete(listener);
    if (s.size === 0) channels.delete(channel);
  };
}

export function publish(channel: string, event: RecordEvent): void {
  const set = bus().channels.get(channel);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(event);
    } catch {
      /* a broken listener must not stop the others */
    }
  }
}
