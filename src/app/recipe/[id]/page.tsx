import RecipeClient from "./RecipeClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecipeClient id={id} />;
}
