export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealRecipes, mealTimeline, recipes } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { publish } from "@/lib/events";
import { randomEmoji } from "@/lib/emoji";

/* Load a meal with its attached recipes (decorated with title/image for
   display) and its timeline, both ordered. Returns null if the meal is
   missing. Exported for reuse by the export route. */
export function loadMeal(id: string) {
  const meal = db.select().from(meals).where(eq(meals.id, id)).get();
  if (!meal) return null;

  const attached = db
    .select()
    .from(mealRecipes)
    .where(eq(mealRecipes.mealId, id))
    .all()
    .sort((a, b) => a.order - b.order);

  const timeline = db
    .select()
    .from(mealTimeline)
    .where(eq(mealTimeline.mealId, id))
    .all()
    .sort((a, b) => a.order - b.order);

  // decorate with recipe titles/images so the client can render links
  const recipeById = new Map(
    db.select().from(recipes).all().map((r) => [r.id, r])
  );

  return {
    ...meal,
    recipes: attached.map((mr) => {
      const r = recipeById.get(mr.recipeId);
      return {
        id: mr.id,
        recipeId: mr.recipeId,
        order: mr.order,
        title: r?.title ?? "(deleted recipe)",
        imagePath: r?.imagePath ?? null,
        missing: !r,
      };
    }),
    timeline: timeline.map((t) => ({
      ...t,
      recipeTitle: t.recipeId ? recipeById.get(t.recipeId)?.title ?? null : null,
    })),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const meal = loadMeal(id);
    if (!meal) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(meal);
  }

  return Response.json(db.select().from(meals).all());
}

/* Insert the meal's attached recipes and timeline rows. Shared by POST/PUT. */
function writeChildren(
  mealId: string,
  body: {
    recipes?: { recipeId: string }[];
    timeline?: {
      time: string;
      content: string;
      recipeId?: string | null;
      done?: boolean;
    }[];
  }
) {
  (body.recipes ?? []).forEach((r, i) => {
    if (!r.recipeId) return;
    db.insert(mealRecipes)
      .values({ id: uuid(), mealId, recipeId: r.recipeId, order: i })
      .run();
  });

  (body.timeline ?? []).forEach((t, i) => {
    db.insert(mealTimeline)
      .values({
        id: uuid(),
        mealId,
        time: t.time ?? "",
        content: t.content ?? "",
        recipeId: t.recipeId || null,
        done: t.done ?? false,
        order: i,
      })
      .run();
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = uuid();
  const now = new Date();

  db.insert(meals)
    .values({
      id,
      name: body.name,
      description: body.description ?? null,
      emoji: body.emoji || randomEmoji(),
      imagePath: body.imagePath ?? null,
      prepTime: body.prepTime ?? null,
      etaAt: body.etaAt ? new Date(body.etaAt) : null,
      createdBy: body.createdBy ?? "Unknown",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  writeChildren(id, body);

  return Response.json({ id });
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const now = new Date();

  const current = db.select().from(meals).where(eq(meals.id, id)).get();
  if (!current) return Response.json({ error: "Not found" }, { status: 404 });

  // Optimistic concurrency — reject stale writes.
  if (body.baseVersion != null && current.version !== body.baseVersion) {
    return Response.json(
      {
        error: "This meal was changed by someone else. Reload to see the latest.",
        currentVersion: current.version,
      },
      { status: 409 }
    );
  }

  const nextVersion = (current.version ?? 1) + 1;

  db.update(meals)
    .set({
      name: body.name,
      description: body.description ?? null,
      emoji: body.emoji || current.emoji || randomEmoji(),
      imagePath: body.imagePath ?? null,
      prepTime: body.prepTime ?? null,
      etaAt: body.etaAt ? new Date(body.etaAt) : null,
      updatedAt: now,
      version: nextVersion,
    })
    .where(eq(meals.id, id))
    .run();

  // replace child rows wholesale
  db.delete(mealRecipes).where(eq(mealRecipes.mealId, id)).run();
  db.delete(mealTimeline).where(eq(mealTimeline.mealId, id)).run();
  writeChildren(id, body);

  publish(`meal:${id}`, {
    type: "updated",
    version: nextVersion,
    origin: body.origin,
  });

  return Response.json({ id, version: nextVersion });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  db.delete(mealRecipes).where(eq(mealRecipes.mealId, id)).run();
  db.delete(mealTimeline).where(eq(mealTimeline.mealId, id)).run();
  db.delete(meals).where(eq(meals.id, id)).run();

  publish(`meal:${id}`, { type: "deleted" });

  return Response.json({ ok: true });
}
