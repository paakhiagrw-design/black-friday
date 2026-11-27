import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { databasePath } from "./storage.mjs";

export function openDatabase() {
  const file =
    process.env.NEXT_PHASE === "phase-production-build"
      ? ":memory:"
      : databasePath();
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  try {
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    const sql = (name) =>
      readFileSync(path.join(process.cwd(), "database", name), "utf8");
    const migrations = readdirSync(
      path.join(process.cwd(), "database/migrations"),
    )
      .filter((name) => name.endsWith(".sql"))
      .sort();
    db.transaction(() => {
      db.exec(sql("schema.sql"));
      for (const name of migrations)
        db.exec(sql(path.join("migrations", name)));
    }).immediate();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
