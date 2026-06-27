export const runtime = "nodejs";

import { db } from "@/db";
import { meals, mealRecipes, mealTimeline } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { createRecipeFromPayload, saveEmbeddedImage } from "@/lib/recipeIO";
import { randomEmoji } from "@/lib/emoji";

export async function POST(req: Request) {
  let parsed: any;
  try {
    parsed = await req.json();
  } catch {
    return Response.json({ error: "Not a valid meal file" }, { status: 400 });
  }

  if (parsed?.format !== "meal-app" || !parsed?.meal?.name) {
    return Response.json({ error: "Unrecognised meal file" }, { status: 400 });
  }

  const m = parsed.meal;
  const mealId = uuid();
  const now = new Date();

  // Recreate each embedded recipe, mapping its export key to the new id.
  const idByKey = new Map<string, string>();
  for (const entry of m.recipes ?? []) {
    if (!entry?.recipe?.title) continue;
    const newId = await createRecipeFromPayload(entry.recipe, m.createdBy ?? "Imported");
    if (entry.key) idByKey.set(entry.key, newId);
  }

  const imagePath = await saveEmbeddedImage(m.image);

  db.insert(meals)
    .values({
      id: mealId,
      name: m.name,
      description: m.description ?? null,
      emoji: m.emoji || randomEmoji(),
      imagePath,
      prepTime: m.prepTime ?? null,
      etaAt: m.etaAt ? new Date(m.etaAt) : null,
      createdBy: m.createdBy ?? "Imported",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // attach the recreated recipes in order
  [...idByKey.values()].forEach((recipeId, i) => {
    db.insert(mealRecipes)
      .values({ id: uuid(), mealId, recipeId, order: i })
      .run();
  });

  (m.timeline ?? []).forEach((t: any, i: number) => {
    db.insert(mealTimeline)
      .values({
        id: uuid(),
        mealId,
        time: t.time ?? "",
        content: t.content ?? "",
        recipeId: t.recipeKey ? idByKey.get(t.recipeKey) ?? null : null,
        done: !!t.done,
        order: i,
      })
      .run();
  });

  return Response.json({ id: mealId });
}
