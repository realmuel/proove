import { db } from "@/db";
import { recipes as recipesTable, ingredients as ingredientsTable } from "@/db/schema";
import RecipeBrowser, { BrowserRecipe } from "@/components/RecipeBrowser";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allRecipes = db.select().from(recipesTable).all();
  const allIngredients = db.select().from(ingredientsTable).all();

  // group ingredient names by recipe so search can match on them
  const ingByRecipe = new Map<string, string[]>();
  for (const ing of allIngredients) {
    const list = ingByRecipe.get(ing.recipeId) ?? [];
    list.push(ing.name);
    ingByRecipe.set(ing.recipeId, list);
  }

  const recipes: BrowserRecipe[] = allRecipes
    .map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? "",
      imagePath: r.imagePath ?? "",
      createdBy: r.createdBy ?? "",
      ingredients: ingByRecipe.get(r.id) ?? [],
    }))
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );

  return <RecipeBrowser recipes={recipes} />;
}
