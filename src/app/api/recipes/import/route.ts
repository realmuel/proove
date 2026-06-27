export const runtime = "nodejs";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { recipes, ingredients, steps, tools } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { randomEmoji } from "@/lib/emoji";

export async function POST(req: Request) {
  let parsed: any;
  try {
    parsed = await req.json();
  } catch {
    return Response.json({ error: "Not a valid recipe file" }, { status: 400 });
  }

  if (parsed?.format !== "recipe-app" || !parsed?.recipe?.title) {
    return Response.json(
      { error: "Unrecognised recipe file" },
      { status: 400 }
    );
  }

  const r = parsed.recipe;
  const recipeId = uuid();
  const now = new Date();

  // Decode and store an embedded image, if present.
  let imagePath: string | null = null;
  if (r.image?.dataUrl) {
    const match = String(r.image.dataUrl).match(/^data:(.+?);base64,(.*)$/);
    if (match) {
      const ext = path.extname(r.image.filename || "") || ".jpg";
      const uploadDir = path.join(process.cwd(), "public/uploads");
      await mkdir(uploadDir, { recursive: true });
      const filename = `${Date.now()}-${uuid().slice(0, 8)}${ext}`;
      await writeFile(
        path.join(uploadDir, filename),
        Buffer.from(match[2], "base64")
      );
      imagePath = `/uploads/${filename}`;
    }
  }

  db.insert(recipes)
    .values({
      id: recipeId,
      title: r.title,
      description: r.description ?? null,
      servings: r.servings ?? 1,
      emoji: r.emoji || randomEmoji(),
      ovenTemp: r.ovenTemp ?? null,
      prepTime: r.prepTime ?? null,
      cookTime: r.cookTime ?? null,
      chillTime: r.chillTime ?? null,
      coolTime: r.coolTime ?? null,
      proveTime: r.proveTime ?? null,
      imagePath,
      imagePos: r.imagePos ?? null,
      createdBy: r.createdBy ?? "Imported",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  for (const ing of r.ingredients ?? []) {
    db.insert(ingredients)
      .values({
        id: uuid(),
        recipeId,
        name: ing.name,
        amount: ing.amount ?? 0,
        unit: ing.unit ?? "",
      })
      .run();
  }

  for (const [i, step] of (r.steps ?? []).entries()) {
    db.insert(steps)
      .values({
        id: uuid(),
        recipeId,
        order: step.order ?? i + 1,
        content: step.content ?? "",
      })
      .run();
  }

  for (const tool of r.tools ?? []) {
    db.insert(tools)
      .values({ id: uuid(), recipeId, name: tool.name })
      .run();
  }

  return Response.json({ id: recipeId });
}
