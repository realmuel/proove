import { db } from "@/db";
import { recipes } from "@/db/schema";
import MealForm from "@/components/MealForm";

export const dynamic = "force-dynamic";

export default function NewMealPage() {
  const available = db
    .select()
    .from(recipes)
    .all()
    .map((r) => ({ id: r.id, title: r.title }))
    .sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );

  return <MealForm availableRecipes={available} />;
}
