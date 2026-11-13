export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealTimeline } from "@/db/schema";
import { publish } from "@/lib/events";
import { readJson, badJson } from "@/lib/uploads";

/* Start / stop / reset the meal's prep timers. Kept separate from the meal PUT
   so these run-state changes never collide with an edit, and so every client
   watching the meal stays in sync via SSE.

   POST { mealId, action: "start" | "stop" | "reset", etaAt?, origin }
   start needs etaAt (the plate-up time) and rejects one so soon that the
   earliest task would already be overdue. Stop keeps etaAt; reset clears it. */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badJson();
  const { mealId, action, etaAt, origin } = body as {
    mealId?: string;
    action?: "start" | "stop" | "reset";
    etaAt?: string;
    origin?: string;
  };
  if (!mealId || !action) {
    return Response.json({ error: "Missing mealId or action" }, { status: 400 });
  }

  const meal = db.select().from(meals).where(eq(meals.id, mealId)).get();
  if (!meal) return Response.json({ error: "Not found" }, { status: 404 });

  if (action === "start") {
    const eta = new Date(etaAt ?? "");
    if (Number.isNaN(eta.getTime())) {
      return Response.json({ error: "Missing plate-up time" }, { status: 400 });
    }
    const maxOffset = Math.max(
      0,
      ...db
        .select({ o: mealTimeline.offsetMin })
        .from(mealTimeline)
        .where(eq(mealTimeline.mealId, mealId))
        .all()
        .map((r) => r.o)
    );
    // 60s grace: the picker only has minute precision
    if (eta.getTime() < Date.now() + maxOffset * 60_000 - 60_000) {
      return Response.json(
        { error: "Plate-up is too soon for the first task" },
        { status: 400 }
      );
    }
    db.update(meals)
      .set({ running: true, etaAt: eta })
      .where(eq(meals.id, mealId))
      .run();
  } else if (action === "stop") {
    db.update(meals).set({ running: false }).where(eq(meals.id, mealId)).run();
  } else if (action === "reset") {
    // back to the beginning: stop the timers, clear plate-up, untick every action
    db.update(meals)
      .set({ running: false, etaAt: null })
      .where(eq(meals.id, mealId))
      .run();
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
