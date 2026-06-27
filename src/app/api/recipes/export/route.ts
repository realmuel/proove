export const runtime = "nodejs";

import { readFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, steps, tools } from "@/db/schema";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function safeName(title: string) {
  return (title || "recipe").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const recipe = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!recipe) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const ing = db.select().from(ingredients).where(eq(ingredients.recipeId, id)).all();
  const stp = db.select().from(steps).where(eq(steps.recipeId, id)).all();
  const tls = db.select().from(tools).where(eq(tools.recipeId, id)).all();

  // Embed the image so the file is portable to another instance.
  let image: { filename: string; dataUrl: string } | null = null;
  if (recipe.imagePath) {
    try {
      const filename = path.basename(recipe.imagePath);
      const filepath = path.join(process.cwd(), "public", recipe.imagePath);
      const bytes = await readFile(filepath);
      const mime = MIME[path.extname(filename).toLowerCase()] ?? "image/jpeg";
      image = {
        filename,
        dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
      };
    } catch {
      image = null; // image missing on disk — export without it
    }
  }

  const payload = {
    format: "recipe-app",
    version: 1,
    exportedAt: new Date().toISOString(),
    recipe: {
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      createdBy: recipe.createdBy,
      ovenTemp: recipe.ovenTemp,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      chillTime: recipe.chillTime,
      coolTime: recipe.coolTime,
      proveTime: recipe.proveTime,
      ingredients: ing.map((i) => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
      })),
      steps: stp
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ order: s.order, content: s.content })),
      tools: tls.map((t) => ({ name: t.name })),
      image,
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${safeName(recipe.title)}.recipe"`,
    },
  });
}
