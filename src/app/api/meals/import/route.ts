export const runtime = "nodejs";

import { db } from "@/db";
import { meals, mealRecipes, mealTimeline } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { createRecipeFromPayload, saveEmbeddedImage } from "@/lib/recipeIO";
import { randomEmoji } from "@/lib/emoji";
import { publish } from "@/lib/events";

type RecipeFile = Parameters<typeof createRecipeFromPayload>[0];

type MealFile = {
  name: string;
  description?: string | null;
  emoji?: string | null;
  imagePos?: string | null;
  prepTime?: number | null;
  etaAt?: string | null;
  createdBy?: string;
  image?: { filename?: string; dataUrl?: string } | null;
  recipes?: { key?: string; attached?: boolean; recipe?: RecipeFile }[];
  timeline?: {
    time?: string;
    content?: string;
    recipeKey?: string;
    done?: boolean;
  }[];
};

export async function POST(req: Request) {
  let parsed: { format?: string; meal?: MealFile };
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
  // Track which ones were genuinely attached to the meal (vs. only referenced
  // by a timeline step) so we re-attach exactly the original set. Older files
  // predate the `attached` flag — treat those entries as attached.
  const idByKey = new Map<string, string>();
  const attachedIds: string[] = [];
  for (const entry of m.recipes ?? []) {
    if (!entry?.recipe?.title) continue;
    const newId = await createRecipeFromPayload(entry.recipe, m.createdBy ?? "Imported");
    if (entry.key) idByKey.set(entry.key, newId);
    if (entry.attached !== false) attachedIds.push(newId);
  }

  const imagePath = await saveEmbeddedImage(m.image);

  db.insert(meals)
    .values({
      id: mealId,
      name: m.name,
      description: m.description ?? null,
      emoji: m.emoji || randomEmoji(),
      imagePath,
      imagePos: m.imagePos ?? null,
      prepTime: m.prepTime ?? null,
      etaAt: m.etaAt ? new Date(m.etaAt) : null,
      createdBy: m.createdBy ?? "Imported",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // attach the recreated recipes in order (timeline-only recipes stay linked
  // through the timeline below, but aren't added to the attached list)
  attachedIds.forEach((recipeId, i) => {
    db.insert(mealRecipes)
      .values({ id: uuid(), mealId, recipeId, order: i })
      .run();
  });

  (m.timeline ?? []).forEach((t, i) => {
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

  publish("home", { type: "updated" });

  return Response.json({ id: mealId });
}
