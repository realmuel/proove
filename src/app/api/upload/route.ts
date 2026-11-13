import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { processUploadImage } from "@/lib/processImage";

export const runtime = "nodejs";

const MAX_UPLOAD = 15 * 1024 * 1024;

export async function POST(req: Request) {
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return Response.json({ error: "Bad form data" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD) {
    return Response.json({ error: "File too large" }, { status: 413 });
  }

  // resize/normalise so stored images are web-sized; rejects non-images
  let out: Awaited<ReturnType<typeof processUploadImage>>;
  try {
    out = await processUploadImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return Response.json({ error: "Not a valid image" }, { status: 400 });
  }
  const { buffer, ext } = out;

  const uploadDir = path.join(process.cwd(), "public/uploads");
  await mkdir(uploadDir, { recursive: true });

  // safe, unique filename — no spaces or odd characters in the served URL
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  await writeFile(path.join(uploadDir, filename), buffer);

  return Response.json({
    path: `/uploads/${filename}`,
  });
}
