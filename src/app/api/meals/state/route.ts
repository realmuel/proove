export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealTimeline } from "@/db/schema";
import { publish } from "@/lib/events";

/* Start / stop / reset the meal's prep timers. Kept separate from the meal PUT
   so these run-state changes never collide with an edit, and so every client
   watching the meal stays in sync via SSE.

   POST { mealId, action: "start" | "stop" | "reset", origin } */
export async function POST(req: Request) {
  const body = await req.json();
  const { mealId, action, origin } = body as {
    mealId?: string;
    action?: "start" | "stop" | "reset";
    origin?: string;
  };
  if (!mealId || !action) {
    return Response.json({ error: "Missing mealId or action" }, { status: 400 });
  }

  const meal = db.select().from(meals).where(eq(meals.id, mealId)).get();
  if (!meal) return Response.json({ error: "Not found" }, { status: 404 });

  if (action === "start" || action === "stop") {
    db.update(meals)
      .set({ running: action === "start" })
      .where(eq(meals.id, mealId))
      .run();
  } else if (action === "reset") {
    // back to the beginning: stop the timers and untick every action
    db.update(meals).set({ running: false }).where(eq(meals.id, mealId)).run();
    db.update(mealTimeline)
      .set({ done: false })
      .where(eq(mealTimeline.mealId, mealId))
      .run();
  } else {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  publish(`meal:${mealId}`, { type: "updated", origin });
  return Response.json({ ok: true });
}
