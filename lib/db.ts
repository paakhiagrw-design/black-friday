import 'server-only';

import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const databasePath = path.join(process.cwd(), 'database', 'reroute.db');

const globalForDatabase = globalThis as typeof globalThis & {
  rerouteDatabase?: Database.Database;
};

function createDatabase(): Database.Database {
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  database.pragma('journal_mode = WAL');

  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  database.exec(readFileSync(schemaPath, 'utf8'));
  return database;
}

/** Shared server-side SQLite connection. Never import this from a Client Component. */
export const db = globalForDatabase.rerouteDatabase ?? createDatabase();

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.rerouteDatabase = db;
}
