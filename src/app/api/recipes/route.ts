export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, steps, tools, cookLogs } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { publish } from "@/lib/events";
import { randomEmoji } from "@/lib/emoji";

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
  const body = await req.json();

  const recipeId = uuid();
  //const now = Date.now();
  const now = new Date();

  // 1. insert recipe
  db.insert(recipes).values({
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

    imagePath: body.imagePath ?? null,

    createdBy: body.createdBy ?? "Unknown",
    createdAt: now,
    updatedAt: now,
  }).run();

  // 2. ingredients
  for (const ing of body.ingredients ?? []) {
    db.insert(ingredients).values({
      id: uuid(),
      recipeId,
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
    }).run();
  }

  // 3. steps
  for (const step of body.steps ?? []) {
    db.insert(steps).values({
      id: uuid(),
      recipeId,
      order: step.order,
      content: step.content,
    }).run();
  }

  // 4. tools
  for (const tool of body.tools ?? []) {
    db.insert(tools).values({
      id: uuid(),
      recipeId,
      name: tool.name,
    }).run();
  }

  return Response.json({ id: recipeId });
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await req.json();
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

  // update the recipe row (createdAt/createdBy left untouched)
  db.update(recipes)
    .set({
      title: body.title,
      description: body.description ?? null,
      servings: body.servings,
      emoji: body.emoji || current.emoji || randomEmoji(),
      ovenTemp: body.ovenTemp ?? null,
      prepTime: body.prepTime ?? null,
      cookTime: body.cookTime ?? null,
      chillTime: body.chillTime ?? null,
      coolTime: body.coolTime ?? null,
      proveTime: body.proveTime ?? null,
      imagePath: body.imagePath ?? null,
      updatedAt: now,
      version: nextVersion,
    })
    .where(eq(recipes.id, id))
    .run();

  // replace child rows wholesale — simplest correct approach for personal use
  db.delete(ingredients).where(eq(ingredients.recipeId, id)).run();
  db.delete(steps).where(eq(steps.recipeId, id)).run();
  db.delete(tools).where(eq(tools.recipeId, id)).run();

  for (const ing of body.ingredients ?? []) {
    db.insert(ingredients)
      .values({
        id: uuid(),
        recipeId: id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })
      .run();
  }

  for (const step of body.steps ?? []) {
    db.insert(steps)
      .values({
        id: uuid(),
        recipeId: id,
        order: step.order,
        content: step.content,
      })
      .run();
  }

  for (const tool of body.tools ?? []) {
    db.insert(tools)
      .values({ id: uuid(), recipeId: id, name: tool.name })
      .run();
  }

  publish(`recipe:${id}`, {
    type: "updated",
    version: nextVersion,
    origin: body.origin,
  });

  return Response.json({ id, version: nextVersion });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  db.delete(ingredients).where(eq(ingredients.recipeId, id)).run();
  db.delete(steps).where(eq(steps.recipeId, id)).run();
  db.delete(tools).where(eq(tools.recipeId, id)).run();
  db.delete(cookLogs).where(eq(cookLogs.recipeId, id)).run();
  db.delete(recipes).where(eq(recipes.id, id)).run();

  publish(`recipe:${id}`, { type: "deleted" });

  return Response.json({ ok: true });
}