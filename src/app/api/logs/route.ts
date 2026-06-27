export const runtime = "nodejs";

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { cookLogs } from "@/db/schema";
import { v4 as uuid } from "uuid";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get("recipeId");
  if (!recipeId) {
    return Response.json({ error: "Missing recipeId" }, { status: 400 });
  }

  const logs = db
    .select()
    .from(cookLogs)
    .where(eq(cookLogs.recipeId, recipeId))
    .orderBy(desc(cookLogs.cookedAt))
    .all();

  return Response.json(logs);
}

export async function POST(req: Request) {
  const body = await req.json();

  const id = uuid();
  db.insert(cookLogs)
    .values({
      id,
      recipeId: body.recipeId,
      cookedAt: new Date(),
      notes: body.notes?.trim() ? body.notes.trim() : null,
    })
    .run();

  return Response.json({ id });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  db.delete(cookLogs).where(eq(cookLogs.id, id)).run();
  return Response.json({ ok: true });
}
