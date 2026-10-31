export const runtime = "nodejs";

import { publish } from "@/lib/events";
import { createRecipeFromPayload } from "@/lib/recipeIO";

export async function POST(req: Request) {
  let parsed: {
    format?: string;
    recipe?: Parameters<typeof createRecipeFromPayload>[0];
  };
  try {
    parsed = await req.json();
  } catch {
    return Response.json({ error: "Not a valid recipe file" }, { status: 400 });
  }

  if (parsed?.format !== "recipe-app" || !parsed?.recipe?.title) {
    return Response.json(
      { error: "Unrecognised recipe file" },
      { status: 400 }
    );
  }

  const recipeId = await createRecipeFromPayload(parsed.recipe);

  publish("home", { type: "updated" });

  return Response.json({ id: recipeId });
}
