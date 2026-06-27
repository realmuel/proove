"use client";

import { use, useEffect, useState } from "react";
import MealForm, { MealFormData } from "@/components/MealForm";

/* Convert a stored timestamp to a value for <input type="datetime-local">,
   in the viewer's local time. */
function toLocalInput(value: string | number): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
          etaAt: data.etaAt ? toLocalInput(data.etaAt) : "",
          version: data.version ?? 1,
          recipes:
            data.recipes?.map((r: any) => ({ recipeId: r.recipeId })) ?? [],
          timeline:
            data.timeline?.map((t: any) => ({
              time: t.time ?? "",
              content: t.content ?? "",
              recipeId: t.recipeId ?? null,
            })) ?? [],
        });
      });

    fetch(`/api/recipes`)
      .then((r) => r.json())
      .then((list: any[]) =>
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
