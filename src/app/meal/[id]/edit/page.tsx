"use client";

import { use, useEffect, useState } from "react";
import MealForm, { MealFormData } from "@/components/MealForm";

export default function EditMealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [initial, setInitial] = useState<Partial<MealFormData> | null>(null);
  const [available, setAvailable] = useState<
    { id: string; title: string }[] | null
  >(null);

  useEffect(() => {
    fetch(`/api/meals?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setInitial({
          name: data.name ?? "",
          description: data.description ?? "",
          createdBy: data.createdBy ?? "",
          emoji: data.emoji ?? "",
          imagePath: data.imagePath ?? "",
          imagePos: data.imagePos ?? "50% 50%",
          prepTime: data.prepTime ?? null,
          version: data.version ?? 1,
          recipes:
            data.recipes?.map((r: MealFormData["recipes"][number]) => ({ recipeId: r.recipeId })) ?? [],
          timeline:
            data.timeline?.map((t: Partial<MealFormData["timeline"][number]>) => ({
              offsetMin: t.offsetMin ?? 0,
              content: t.content ?? "",
              recipeId: t.recipeId ?? null,
            })) ?? [],
        });
      });

    fetch(`/api/recipes`)
      .then((r) => r.json())
      .then((list: { id: string; title: string }[]) =>
        setAvailable(
          list
            .map((r) => ({ id: r.id, title: r.title }))
            .sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
            )
        )
      );
  }, [id]);

  if (!initial || !available) return <p className="text-muted">Loading…</p>;

  return <MealForm initial={initial} mealId={id} availableRecipes={available} />;
}
