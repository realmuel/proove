import sharp from "sharp";
import path from "path";

/* Normalise an uploaded image before it's stored:
   - honour EXIF orientation (so phone photos aren't sideways),
   - cap the longest side so a 4000px camera shot becomes web-sized,
   - re-encode small: JPEG for opaque images, PNG when there's transparency.

   This keeps served files to a couple hundred KB instead of multiple MB, which
   is what makes them load reliably. Falls back to the original bytes if sharp
   can't read the input. */

const MAX_DIM = 1600; // px on the longest side

export async function processUploadImage(
  input: Buffer,
  originalName = ""
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    const pipeline = sharp(input, { failOn: "none" }).rotate();
    const meta = await pipeline.metadata();

    const resized = pipeline.resize({
      width: MAX_DIM,
      height: MAX_DIM,
      fit: "inside",
      withoutEnlargement: true,
    });

    // Preserve transparency as PNG; everything else becomes a compact JPEG.
    if (meta.hasAlpha) {
      return {
        buffer: await resized.png({ compressionLevel: 9 }).toBuffer(),
        ext: ".png",
      };
    }
    return {
      buffer: await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
      ext: ".jpg",
    };
  } catch {
    return {
      buffer: input,
      ext: path.extname(originalName).toLowerCase() || ".bin",
    };
  }
}
