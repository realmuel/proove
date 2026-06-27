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

export const db = drizzle(sqlite);
