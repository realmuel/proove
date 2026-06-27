import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { processUploadImage } from "@/lib/processImage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return Response.json({ error: "No file" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  // resize/normalise so stored images are web-sized and load reliably
  const { buffer, ext } = await processUploadImage(input, file.name);

  const uploadDir = path.join(process.cwd(), "public/uploads");
  await mkdir(uploadDir, { recursive: true });

  // safe, unique filename — no spaces or odd characters in the served URL
  const filename = `${Date.now()}-${uuid().slice(0, 8)}${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);

  return Response.json({
    path: `/uploads/${filename}`,
  });
}
