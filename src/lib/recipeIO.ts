import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, steps, tools } from "@/db/schema";
import { uploadFile, UPLOAD_DIR } from "@/lib/uploads";
import { randomEmoji } from "@/lib/emoji";
import { processUploadImage } from "@/lib/processImage";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

type RecipePayload = {
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
      const filepath = uploadFile(recipe.imagePath);
      if (!filepath) throw new Error("bad image path");
      const filename = path.basename(filepath);
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
  // resize/normalise embedded images on import, same as fresh uploads;
  // anything that isn't a decodable image is dropped
  let processed: Awaited<ReturnType<typeof processUploadImage>>;
  try {
    processed = await processUploadImage(Buffer.from(match[2], "base64"));
  } catch {
    return null;
  }
  const { buffer, ext } = processed;
  const uploadDir = UPLOAD_DIR;
  await mkdir(uploadDir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

/* Recreate a recipe from a portable payload, returning the new recipe id. */
export async function createRecipeFromPayload(
  r: Partial<RecipePayload> & { title: string },
  createdByFallback = "Imported"
): Promise<string> {
  const recipeId = crypto.randomUUID();
  const now = new Date();
  const imagePath = await saveEmbeddedImage(r.image);

  db.transaction((tx) => {
    tx.insert(recipes)
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
      tx.insert(ingredients)
        .values({
          id: crypto.randomUUID(),
          recipeId,
          name: ing.name,
          amount: ing.amount ?? 0,
          unit: ing.unit ?? "",
        })
        .run();
    }

    (r.steps ?? []).forEach((step, i) => {
      tx.insert(steps)
        .values({
          id: crypto.randomUUID(),
          recipeId,
          order: step.order ?? i + 1,
          content: step.content ?? "",
        })
        .run();
    });

    for (const tool of r.tools ?? []) {
      tx.insert(tools).values({ id: crypto.randomUUID(), recipeId, name: tool.name }).run();
    }
  });

  return recipeId;
}

export { saveEmbeddedImage };
