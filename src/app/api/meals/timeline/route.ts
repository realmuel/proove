export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mealTimeline } from "@/db/schema";
import { publish } from "@/lib/events";

/* Check or uncheck a single timeline action. Kept separate from the meal PUT
   so ticking things off mid-cook never collides with an edit in progress. */
export async function POST(req: Request) {
  const body = await req.json();
  const { id, done, origin } = body as {
    id?: string;
    done?: boolean;
    origin?: string;
  };
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const item = db
    .select()
    .from(mealTimeline)
    .where(eq(mealTimeline.id, id))
    .get();
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });

  db.update(mealTimeline)
    .set({ done: !!done })
    .where(eq(mealTimeline.id, id))
    .run();

  publish(`meal:${item.mealId}`, { type: "updated", origin });

  return Response.json({ ok: true });
}
