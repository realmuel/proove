export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealRecipes, mealTimeline, recipes } from "@/db/schema";
import { publish } from "@/lib/events";
import { randomEmoji } from "@/lib/emoji";
import { safeImagePath, readJson, badJson } from "@/lib/uploads";

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
        imagePos: r?.imagePos ?? null,
        emoji: r?.emoji ?? null,
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
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function writeChildren(
  tx: Tx,
  mealId: string,
  body: {
    recipes?: { recipeId: string }[];
    timeline?: {
      offsetMin: number;
      content: string;
      recipeId?: string | null;
      done?: boolean;
    }[];
  }
) {
  (body.recipes ?? []).forEach((r, i) => {
    if (!r.recipeId) return;
    tx.insert(mealRecipes)
      .values({ id: crypto.randomUUID(), mealId, recipeId: r.recipeId, order: i })
      .run();
  });

  (body.timeline ?? []).forEach((t, i) => {
    tx.insert(mealTimeline)
      .values({
        id: crypto.randomUUID(),
        mealId,
        offsetMin: Math.max(0, Math.round(Number(t.offsetMin)) || 0),
        content: t.content ?? "",
        recipeId: t.recipeId || null,
        done: t.done ?? false,
        order: i,
      })
      .run();
  });
}

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badJson();
  const id = crypto.randomUUID();
  const now = new Date();

  db.transaction((tx) => {
    tx.insert(meals)
      .values({
        id,
        name: body.name,
        description: body.description ?? null,
        emoji: body.emoji || randomEmoji(),
        imagePath: safeImagePath(body.imagePath),
        imagePos: body.imagePos ?? null,
        prepTime: body.prepTime ?? null,
        createdBy: body.createdBy ?? "Unknown",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    writeChildren(tx, id, body);
  });

  publish("home", { type: "updated", origin: body.origin });

  return Response.json({ id });
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const body = await readJson(req);
  if (!body) return badJson();
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

  db.transaction((tx) => {
    tx.update(meals)
      .set({
        name: body.name,
        description: body.description ?? null,
        emoji: body.emoji || current.emoji || randomEmoji(),
        createdBy: body.createdBy ?? current.createdBy,
        imagePath: safeImagePath(body.imagePath),
        imagePos: body.imagePos ?? null,
        prepTime: body.prepTime ?? null,
        updatedAt: now,
        version: nextVersion,
      })
      .where(eq(meals.id, id))
      .run();

    tx.delete(mealRecipes).where(eq(mealRecipes.mealId, id)).run();
    tx.delete(mealTimeline).where(eq(mealTimeline.mealId, id)).run();
    writeChildren(tx, id, body);
  });

  publish(`meal:${id}`, {
    type: "updated",
    version: nextVersion,
    origin: body.origin,
  });
  publish("home", { type: "updated", origin: body.origin });

  return Response.json({ id, version: nextVersion });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  // attached recipes and timeline go with it via ON DELETE CASCADE
  db.delete(meals).where(eq(meals.id, id)).run();

  publish(`meal:${id}`, { type: "deleted" });
  publish("home", { type: "deleted" });

  return Response.json({ ok: true });
}
