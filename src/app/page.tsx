import { db } from "@/db";
import {
  recipes as recipesTable,
  ingredients as ingredientsTable,
  meals as mealsTable,
  mealRecipes as mealRecipesTable,
} from "@/db/schema";
import RecipeBrowser, { BrowserItem } from "@/components/RecipeBrowser";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allRecipes = db.select().from(recipesTable).all();
  const allIngredients = db.select().from(ingredientsTable).all();
  const allMeals = db.select().from(mealsTable).all();
  const allMealRecipes = db.select().from(mealRecipesTable).all();

  // group ingredient names by recipe so search can match on them
  const ingByRecipe = new Map<string, string[]>();
  for (const ing of allIngredients) {
    const list = ingByRecipe.get(ing.recipeId) ?? [];
    list.push(ing.name);
    ingByRecipe.set(ing.recipeId, list);
  }

  // recipe titles attached to each meal, for searching
  const recipeTitleById = new Map(allRecipes.map((r) => [r.id, r.title]));
  const recipeNamesByMeal = new Map<string, string[]>();
  for (const mr of allMealRecipes) {
    const list = recipeNamesByMeal.get(mr.mealId) ?? [];
    const t = recipeTitleById.get(mr.recipeId);
    if (t) list.push(t);
    recipeNamesByMeal.set(mr.mealId, list);
  }

  const recipeItems: BrowserItem[] = allRecipes.map((r) => ({
    id: r.id,
    kind: "recipe",
    title: r.title,
    description: r.description ?? "",
    emoji: r.emoji ?? "",
    imagePath: r.imagePath ?? "",
    createdBy: r.createdBy ?? "",
    keywords: ingByRecipe.get(r.id) ?? [],
  }));

  const mealItems: BrowserItem[] = allMeals.map((m) => ({
    id: m.id,
    kind: "meal",
    title: m.name,
    description: m.description ?? "",
    emoji: m.emoji ?? "",
    imagePath: m.imagePath ?? "",
    createdBy: m.createdBy ?? "",
    keywords: recipeNamesByMeal.get(m.id) ?? [],
  }));

  const items: BrowserItem[] = [...recipeItems, ...mealItems].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );

  return <RecipeBrowser items={items} />;
}
