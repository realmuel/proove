export const runtime = "nodejs";

import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealRecipes, mealTimeline } from "@/db/schema";
import { buildRecipePayload } from "@/lib/recipeIO";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function safeName(name: string) {
  return (name || "meal").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const meal = db.select().from(meals).where(eq(meals.id, id)).get();
  if (!meal) return Response.json({ error: "Not found" }, { status: 404 });

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

  // Embed full recipe data so the .meal file is portable to another instance.
  // Each embedded recipe gets a stable key the timeline can reference.
  //
  // Bundle every recipe the meal links to: the attached recipes *and* any
  // recipe a timeline step points at, even if it isn't in the attached list.
  // Dedupe by id, preserving attached order first, then timeline order.
  const linkedIds: string[] = [];
  const seen = new Set<string>();
  for (const mr of attached) {
    if (!seen.has(mr.recipeId)) {
      seen.add(mr.recipeId);
      linkedIds.push(mr.recipeId);
    }
  }
  for (const t of timeline) {
    if (t.recipeId && !seen.has(t.recipeId)) {
      seen.add(t.recipeId);
      linkedIds.push(t.recipeId);
    }
  }

  const attachedIds = new Set(attached.map((mr) => mr.recipeId));
  const recipePayloads: { key: string; recipe: unknown; attached: boolean }[] =
    [];
  const keyByRecipeId = new Map<string, string>();
  for (const recipeId of linkedIds) {
    const payload = await buildRecipePayload(recipeId);
    if (!payload) continue;
    const key = `r${recipePayloads.length}`;
    keyByRecipeId.set(recipeId, key);
    recipePayloads.push({
      key,
      recipe: payload,
      attached: attachedIds.has(recipeId),
    });
  }

  // Embed the meal image too.
  let image: { filename: string; dataUrl: string } | null = null;
  if (meal.imagePath) {
    try {
      const filename = path.basename(meal.imagePath);
      const filepath = path.join(process.cwd(), "public", meal.imagePath);
      const bytes = await readFile(filepath);
      const mime = MIME[path.extname(filename).toLowerCase()] ?? "image/jpeg";
      image = {
        filename,
        dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
      };
    } catch {
      image = null;
    }
  }

  const payload = {
    format: "meal-app",
    version: 1,
    exportedAt: new Date().toISOString(),
    meal: {
      name: meal.name,
      description: meal.description,
      createdBy: meal.createdBy,
      emoji: meal.emoji,
      imagePos: meal.imagePos,
      prepTime: meal.prepTime,
      etaAt: meal.etaAt ? new Date(meal.etaAt).toISOString() : null,
      image,
      recipes: recipePayloads,
      timeline: timeline.map((t) => ({
        time: t.time,
        content: t.content,
        done: t.done,
        recipeKey: t.recipeId ? keyByRecipeId.get(t.recipeId) ?? null : null,
      })),
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${safeName(meal.name)}.meal"`,
    },
  });
}
