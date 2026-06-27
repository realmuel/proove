/*
 * One-off: shrink and rename images already stored before uploads were resized.
 *
 * For every recipe/meal image it finds, it re-encodes a web-sized copy (longest
 * side <= 1600px, compact JPEG/PNG) under a safe filename, points the database
 * at the new file and deletes the old one. Big or awkwardly-named files are the
 * ones that load unreliably; already-optimised files are skipped, so it's safe
 * to run more than once.
 *
 * Run it where the data lives, e.g. inside the container:
 *   docker compose exec proove node scripts/optimize-images.cjs
 * or locally:
 *   node scripts/optimize-images.cjs
 */
const path = require("path");
const fs = require("fs");
const { readFile, writeFile, unlink } = require("fs/promises");
const { randomUUID } = require("crypto");
const Database = require("better-sqlite3");
const sharp = require("sharp");

const MAX_DIM = 1600;
const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "sqlite.db");
const publicDir = path.join(process.cwd(), "public");
const uploadDir = path.join(publicDir, "uploads");

async function optimize(input) {
  const pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const resized = pipeline.resize({
    width: MAX_DIM,
    height: MAX_DIM,
    fit: "inside",
    withoutEnlargement: true,
  });
  if (meta.hasAlpha) {
    return { buffer: await resized.png({ compressionLevel: 9 }).toBuffer(), ext: ".png" };
  }
  return { buffer: await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer(), ext: ".jpg" };
}

async function main() {
  const db = new Database(dbPath);

  const targets = [];
  for (const table of ["recipes", "meals"]) {
    const exists = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
      .get(table);
    if (!exists) continue;
    const rows = db
      .prepare(
        `SELECT id, image_path AS imagePath FROM ${table} WHERE image_path IS NOT NULL AND image_path != ''`
      )
      .all();
    for (const r of rows) targets.push({ table, ...r });
  }

  let optimized = 0;
  let skipped = 0;
  let missing = 0;

  for (const t of targets) {
    const abs = path.join(publicDir, t.imagePath.replace(/^\//, ""));
    if (!fs.existsSync(abs)) {
      console.log(`missing file, leaving as-is: ${t.imagePath}`);
      missing++;
      continue;
    }

    const input = await readFile(abs);
    const meta = await sharp(input).metadata().catch(() => null);
    if (!meta) {
      console.log(`not a readable image, skipping: ${t.imagePath}`);
      skipped++;
      continue;
    }

    const tooBig =
      (meta.width ?? 0) > MAX_DIM ||
      (meta.height ?? 0) > MAX_DIM ||
      input.length > 500 * 1024;
    const awkwardName = /[ %]/.test(path.basename(t.imagePath));
    if (!tooBig && !awkwardName) {
      skipped++;
      continue;
    }

    const { buffer, ext } = await optimize(input);
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    await writeFile(path.join(uploadDir, filename), buffer);
    db.prepare(`UPDATE ${t.table} SET image_path = ? WHERE id = ?`).run(
      `/uploads/${filename}`,
      t.id
    );
    if (path.resolve(abs) !== path.resolve(uploadDir, filename)) {
      await unlink(abs).catch(() => {});
    }

    console.log(
      `${t.table}: ${(input.length / 1024).toFixed(0)}KB -> ${(
        buffer.length / 1024
      ).toFixed(0)}KB   ${t.imagePath} -> /uploads/${filename}`
    );
    optimized++;
  }

  db.close();
  console.log(`\nDone. optimized=${optimized} skipped=${skipped} missing=${missing}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
