import MealClient from "./MealClient";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MealClient id={id} />;
}
