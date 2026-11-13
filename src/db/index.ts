import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";

// Where the SQLite file lives. Defaults to ./sqlite.db for local dev; in Docker
// it's pointed at a mounted volume via DATABASE_PATH. No env var is required to
// run locally.
const dbPath = process.env.DATABASE_PATH || "sqlite.db";

// Make sure the containing directory exists (e.g. a freshly-mounted volume).
mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const sqlite = new Database(dbPath);
// WAL: readers don't block the writer and it's crash-safer; busy_timeout waits
// instead of failing on a locked DB; foreign keys enforce the cascades.
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);
