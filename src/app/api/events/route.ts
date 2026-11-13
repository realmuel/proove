export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { subscribe, type RecordEvent } from "@/lib/events";

const MAX_STREAMS = 200;
let open = 0;

/* SSE stream of changes for a single record.
   GET /api/events?channel=recipe:<id>  (or meal:<id>) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel");
  if (!channel || !/^(home|(recipe|meal):[\w-]{1,64})$/.test(channel)) {
    return Response.json({ error: "Bad channel" }, { status: 400 });
  }
  if (open >= MAX_STREAMS) {
    return Response.json({ error: "Too many streams" }, { status: 503 });
  }
  open++;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // initial comment so the connection is established immediately
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribe(channel, (e: RecordEvent) => {
        send("change", e);
      });

      // keep-alive ping so proxies don't drop an idle connection
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* stream already closed */
        }
      }, 25000);

      const close = () => {
        if (closed) return;
        closed = true;
        open--;
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      let closed = false;
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
