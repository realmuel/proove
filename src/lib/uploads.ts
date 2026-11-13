import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

const UPLOAD_URL = /^\/uploads\/[\w.-]+$/;

/* Only accept `/uploads/<bare filename>` as a stored image path; anything else
   (e.g. `../../etc/passwd`) becomes null. Use on every write. */
export function safeImagePath(v: unknown): string | null {
  return typeof v === "string" && UPLOAD_URL.test(v) && !v.includes("..") ? v : null;
}

/* Absolute on-disk path for a stored image path, or null if it isn't a valid
   upload path. Use on every read, since old rows may predate the write check. */
export function uploadFile(imagePath: string | null | undefined): string | null {
  const p = safeImagePath(imagePath);
  return p ? path.join(UPLOAD_DIR, path.basename(p)) : null;
}

/* Parse a JSON request body; null on malformed input instead of a 500. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readJson(req: Request): Promise<Record<string, any> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : null;
  } catch {
    return null;
  }
}

export const badJson = () => Response.json({ error: "Invalid JSON body" }, { status: 400 });
