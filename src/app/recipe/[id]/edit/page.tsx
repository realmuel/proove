"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import RecipeForm, { RecipeFormData } from "@/components/RecipeForm";

export default function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [initial, setInitial] = useState<Partial<RecipeFormData> | null>(null);

  useEffect(() => {
    fetch(`/api/recipes?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setInitial({
          title: data.title ?? "",
          description: data.description ?? "",
          servings: data.servings ?? 1,
          createdBy: data.createdBy ?? "",
          ovenTemp: data.ovenTemp ?? null,
          prepTime: data.prepTime ?? null,
          cookTime: data.cookTime ?? null,
          chillTime: data.chillTime ?? null,
          coolTime: data.coolTime ?? null,
          proveTime: data.proveTime ?? null,
          imagePath: data.imagePath ?? "",
          ingredients:
            data.ingredients?.map((i: any) => ({
              name: i.name,
              amount: i.amount,
              unit: i.unit,
            })) ?? [],
          tools: data.tools?.map((t: any) => ({ name: t.name })) ?? [],
          steps:
            data.steps
              ?.slice()
              .sort((a: any, b: any) => a.order - b.order)
              .map((s: any) => ({ order: s.order, content: s.content })) ?? [],
        });
      });
  }, [id]);

  if (!initial) return <p>Loading…</p>;

  return <RecipeForm initial={initial} recipeId={id} />;
}
