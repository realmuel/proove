export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, steps, tools } from "@/db/schema";
import { publish } from "@/lib/events";
import { randomEmoji } from "@/lib/emoji";
import { safeImagePath, readJson, badJson } from "@/lib/uploads";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const recipe = db.select().from(recipes).where(eq(recipes.id, id)).get();
    const ing = db.select().from(ingredients).where(eq(ingredients.recipeId, id)).all();
    const stp = db.select().from(steps).where(eq(steps.recipeId, id)).all();
    const tls = db.select().from(tools).where(eq(tools.recipeId, id)).all();

    return Response.json({
      ...recipe,
      ingredients: ing,
      steps: stp,
      tools: tls,
    });
  }

  const all = db.select().from(recipes).all();
  return Response.json(all);
}

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badJson();

  const recipeId = crypto.randomUUID();
  //const now = Date.now();
  const now = new Date();

  db.transaction((tx) => {
    // 1. insert recipe
    tx.insert(recipes).values({
      id: recipeId,
      title: body.title,
      description: body.description ?? null,
      servings: body.servings,
      emoji: body.emoji || randomEmoji(),

      ovenTemp: body.ovenTemp ?? null,
      prepTime: body.prepTime ?? null,
      cookTime: body.cookTime ?? null,
      chillTime: body.chillTime ?? null,
      coolTime: body.coolTime ?? null,
      proveTime: body.proveTime ?? null,

      imagePath: safeImagePath(body.imagePath),
      imagePos: body.imagePos ?? null,

      createdBy: body.createdBy ?? "Unknown",
      createdAt: now,
      updatedAt: now,
    }).run();

    // 2. ingredients
    for (const ing of body.ingredients ?? []) {
      tx.insert(ingredients).values({
        id: crypto.randomUUID(),
        recipeId,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      }).run();
    }

    // 3. steps
    for (const step of body.steps ?? []) {
      tx.insert(steps).values({
        id: crypto.randomUUID(),
        recipeId,
        order: step.order,
        content: step.content,
      }).run();
    }

    // 4. tools
    for (const tool of body.tools ?? []) {
      tx.insert(tools).values({
        id: crypto.randomUUID(),
        recipeId,
        name: tool.name,
      }).run();
    }
  });

  publish("home", { type: "updated", origin: body.origin });

  return Response.json({ id: recipeId });
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await readJson(req);
  if (!body) return badJson();
  const now = new Date();

  const current = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!current) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Optimistic concurrency: reject the write if the recipe changed since the
  // client loaded it. The client decides whether to reload and retry.
  if (body.baseVersion != null && current.version !== body.baseVersion) {
    return Response.json(
      {
        error: "This recipe was changed by someone else. Reload to see the latest.",
        currentVersion: current.version,
      },
      { status: 409 }
    );
  }

  const nextVersion = (current.version ?? 1) + 1;

  db.transaction((tx) => {
    // update the recipe row (createdAt/createdBy left untouched)
    tx.update(recipes)
      .set({
        title: body.title,
        description: body.description ?? null,
        servings: body.servings,
        emoji: body.emoji || current.emoji || randomEmoji(),
        createdBy: body.createdBy ?? current.createdBy,
        ovenTemp: body.ovenTemp ?? null,
        prepTime: body.prepTime ?? null,
        cookTime: body.cookTime ?? null,
        chillTime: body.chillTime ?? null,
        coolTime: body.coolTime ?? null,
        proveTime: body.proveTime ?? null,
        imagePath: safeImagePath(body.imagePath),
        imagePos: body.imagePos ?? null,
        updatedAt: now,
        version: nextVersion,
      })
      .where(eq(recipes.id, id))
      .run();

    // replace child rows wholesale — simplest correct approach for personal use
    tx.delete(ingredients).where(eq(ingredients.recipeId, id)).run();
    tx.delete(steps).where(eq(steps.recipeId, id)).run();
    tx.delete(tools).where(eq(tools.recipeId, id)).run();

    for (const ing of body.ingredients ?? []) {
      tx.insert(ingredients)
        .values({
          id: crypto.randomUUID(),
          recipeId: id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
        })
        .run();
    }

    for (const step of body.steps ?? []) {
      tx.insert(steps)
        .values({
          id: crypto.randomUUID(),
          recipeId: id,
          order: step.order,
          content: step.content,
        })
        .run();
    }

    for (const tool of body.tools ?? []) {
      tx.insert(tools)
        .values({ id: crypto.randomUUID(), recipeId: id, name: tool.name })
        .run();
    }
  });

  publish(`recipe:${id}`, {
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
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  // child rows go with it via ON DELETE CASCADE
  db.delete(recipes).where(eq(recipes.id, id)).run();

  publish(`recipe:${id}`, { type: "deleted" });
  publish("home", { type: "deleted" });

  return Response.json({ ok: true });
}