/*
 * Apply Drizzle migrations to the SQLite database, creating the file and its
 * tables if they don't exist yet. Run once at container start-up (see the
 * Dockerfile CMD) so a brand-new volume gets a working schema automatically.
 *
 * Idempotent: drizzle tracks applied migrations in __drizzle_migrations, so
 * re-running on an existing database is a no-op.
 */
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { drizzle } = require("drizzle-orm/better-sqlite3");
const { migrate } = require("drizzle-orm/better-sqlite3/migrator");

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "sqlite.db");

// Ensure the directory (e.g. a freshly-mounted /app/data volume) exists.
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

const table = (name) =>
  sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);

if (table("recipes") && !table("__drizzle_migrations")) {
  // A pre-existing database that wasn't created by the migrator (e.g. an older
  // dev DB built with `drizzle-kit push`). Don't try to recreate its tables —
  // leave the data untouched.
  console.log(`Existing database detected at ${dbPath}; leaving schema as-is.`);
} else {
  // Fresh volume, or a migrator-managed database: create/upgrade the schema.
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log(`Database ready at ${dbPath}`);
}

sqlite.close();
