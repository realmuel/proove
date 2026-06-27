import RecipeClient from "./RecipeClient";

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
  return <RecipeClient id={id} backHref={backHref} />;
}
