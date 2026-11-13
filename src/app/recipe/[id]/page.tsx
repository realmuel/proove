import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { recipes, ingredients, steps } from "@/db/schema";
import { formatAmount } from "@/lib/format";
import RecipeClient from "./RecipeClient";

export const dynamic = "force-dynamic";

// minutes -> ISO 8601 duration ("PT1H30M"); undefined when unset
const iso = (m: number | null) => (m ? `PT${Math.floor(m / 60)}H${m % 60}M` : undefined);

/* The page itself renders client-side, so crawlers and Safari's recipe view
   (which read schema.org/Recipe from the served HTML) saw nothing. Emit it
   server-side as JSON-LD. */
async function recipeJsonLd(id: string) {
  const r = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!r) return null;
  const ing = db.select().from(ingredients).where(eq(ingredients.recipeId, id)).all();
  const stp = db.select().from(steps).where(eq(steps.recipeId, id)).orderBy(asc(steps.order)).all();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";
  const total = (r.prepTime ?? 0) + (r.cookTime ?? 0) + (r.chillTime ?? 0) + (r.coolTime ?? 0) + (r.proveTime ?? 0);

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.title,
    description: r.description || undefined,
    image: r.imagePath ? [r.imagePath.startsWith("/") ? origin + r.imagePath : r.imagePath] : undefined,
    author: { "@type": "Person", name: r.createdBy },
    datePublished: r.createdAt.toISOString(),
    dateModified: r.updatedAt.toISOString(),
    recipeYield: `${r.servings} servings`,
    prepTime: iso(r.prepTime),
    cookTime: iso(r.cookTime),
    totalTime: iso(total),
    recipeIngredient: ing.map((i) =>
      [formatAmount(i.amount, i.unit), i.unit, i.name].filter(Boolean).join(" ")
    ),
    recipeInstructions: stp.map((s) => ({ "@type": "HowToStep", text: s.content })),
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  // only honour internal paths, so the back link can't be pointed off-site
  const backHref =
    typeof from === "string" && from.startsWith("/") ? from : undefined;
  const ld = await recipeJsonLd(id);
  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          // "<" escaped so recipe text can't close the script tag
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }}
        />
      )}
      <RecipeClient id={id} backHref={backHref} />
    </>
  );
}
