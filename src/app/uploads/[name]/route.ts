import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

export const runtime = "nodejs";
// Always read from disk — never cache the route output at build time.
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

/* Serve uploaded images from disk.

   Next.js only serves files that existed in `public/` at *build time*; images
   uploaded at runtime (and, in Docker, the whole mounted uploads volume) are
   invisible to its static handler and 404. Streaming them through this route
   reads the current file off disk on every request, so fresh uploads and
   volume-mounted images both load reliably. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  // Only ever serve a bare filename out of the uploads dir — no traversal.
  const filename = path.basename(name);
  const filepath = path.join(UPLOAD_DIR, filename);
  if (path.dirname(filepath) !== UPLOAD_DIR) {
    return new Response("Not found", { status: 404 });
  }

  let size: number;
  try {
    const info = await stat(filepath);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    size = info.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const type = MIME[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
  const stream = Readable.toWeb(createReadStream(filepath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      // Filenames are unique per upload, so the bytes never change.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
