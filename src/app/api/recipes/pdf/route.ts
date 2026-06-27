export const runtime = "nodejs";

import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes, ingredients, steps, tools } from "@/db/schema";
import { renderRecipePdf } from "@/lib/recipePdf";

function safeName(title: string) {
  return (title || "recipe").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

// The hero image box in the PDF: full content width on A4 (595.28 − 2×44 pt)
// by a fixed 200pt height. Crop the source to this ratio so the PDF shows the
// same framing as the web hero.
const HERO_ASPECT = (595.28 - 88) / 200;

/* Match CSS object-cover + object-position: pick the crop rectangle of the
   source that the browser would show in a box of the target aspect ratio. */
function coverCrop(
  sw: number,
  sh: number,
  aspect: number,
  pos: string | null
) {
  const m = (pos || "").match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  const px = m ? +m[1] : 50;
  const py = m ? +m[2] : 50;
  if (sw / sh > aspect) {
    const width = Math.round(sh * aspect);
    return { width, height: sh, left: Math.round((sw - width) * (px / 100)), top: 0 };
  }
  const height = Math.round(sw / aspect);
  return { width: sw, height, left: 0, top: Math.round((sh - height) * (py / 100)) };
}

/* Normalise the hero image for @react-pdf: honour EXIF orientation, crop to the
   hero box, and re-encode as a clean JPEG data URL. This also sidesteps a
   parser bug where @react-pdf chokes on some camera JPEGs ("Unknown version").
   Falls back to the raw path if anything goes wrong. */
async function prepareHeroImage(
  absPath: string,
  imagePos: string | null
): Promise<string> {
  try {
    const base = sharp(absPath).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return absPath;
    const crop = coverCrop(meta.width, meta.height, HERO_ASPECT, imagePos);
    const out = await sharp(absPath)
      .rotate()
      .extract(crop)
      .resize({ width: 1100, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return absPath;
  }
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
    if (existsSync(p)) imageAbsPath = await prepareHeroImage(p, recipe.imagePos);
  }

  const buffer = await renderRecipePdf({
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
