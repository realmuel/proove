import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, steps, tools } from "@/db/schema";
import { v4 as uuid } from "uuid";
import { randomEmoji } from "@/lib/emoji";
import { processUploadImage } from "@/lib/processImage";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export type RecipePayload = {
  title: string;
  description: string | null;
  servings: number;
  createdBy: string;
  emoji: string | null;
  ovenTemp: number | null;
  prepTime: number | null;
  cookTime: number | null;
  chillTime: number | null;
  coolTime: number | null;
  proveTime: number | null;
  imagePos: string | null;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: { order: number; content: string }[];
  tools: { name: string }[];
  image: { filename: string; dataUrl: string } | null;
};

/* Build a portable, self-contained recipe object (image embedded as a data
   URL) suitable for a .recipe or embedded .meal export. */
export async function buildRecipePayload(
  recipeId: string
): Promise<RecipePayload | null> {
  const recipe = db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
  if (!recipe) return null;

  const ing = db
    .select()
    .from(ingredients)
    .where(eq(ingredients.recipeId, recipeId))
    .all();
  const stp = db.select().from(steps).where(eq(steps.recipeId, recipeId)).all();
  const tls = db.select().from(tools).where(eq(tools.recipeId, recipeId)).all();

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
      image = null;
    }
  }

  return {
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    createdBy: recipe.createdBy,
    emoji: recipe.emoji,
    ovenTemp: recipe.ovenTemp,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    chillTime: recipe.chillTime,
    coolTime: recipe.coolTime,
    proveTime: recipe.proveTime,
    imagePos: recipe.imagePos,
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
  };
}

async function saveEmbeddedImage(image: {
  filename?: string;
  dataUrl?: string;
} | null | undefined): Promise<string | null> {
  if (!image?.dataUrl) return null;
  const match = String(image.dataUrl).match(/^data:(.+?);base64,(.*)$/);
  if (!match) return null;
  // resize/normalise embedded images on import, same as fresh uploads
  const { buffer, ext } = await processUploadImage(
    Buffer.from(match[2], "base64"),
    image.filename || ""
  );
  const uploadDir = path.join(process.cwd(), "public/uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${uuid().slice(0, 8)}${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

/* Recreate a recipe from a portable payload, returning the new recipe id. */
export async function createRecipeFromPayload(
  r: Partial<RecipePayload> & { title: string },
  createdByFallback = "Imported"
): Promise<string> {
  const recipeId = uuid();
  const now = new Date();
  const imagePath = await saveEmbeddedImage(r.image);

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
      createdBy: r.createdBy ?? createdByFallback,
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

  (r.steps ?? []).forEach((step, i) => {
    db.insert(steps)
      .values({
        id: uuid(),
        recipeId,
        order: step.order ?? i + 1,
        content: step.content ?? "",
      })
      .run();
  });

  for (const tool of r.tools ?? []) {
    db.insert(tools).values({ id: uuid(), recipeId, name: tool.name }).run();
  }

  return recipeId;
}

export { saveEmbeddedImage };
