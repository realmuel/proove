export const runtime = "nodejs";

import { existsSync } from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, steps, tools } from "@/db/schema";
import { renderRecipePdf } from "@/lib/recipePdf";

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

  let imageAbsPath: string | null = null;
  if (recipe.imagePath) {
    const p = path.join(process.cwd(), "public", recipe.imagePath);
    if (existsSync(p)) imageAbsPath = p;
  }

  const buffer = await renderRecipePdf({
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
    steps: stp.map((srow) => ({ order: srow.order, content: srow.content })),
    tools: tls.map((t) => ({ name: t.name })),
    imageAbsPath,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName(recipe.title)}.pdf"`,
    },
  });
}
