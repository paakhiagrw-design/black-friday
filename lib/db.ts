import 'server-only';

import type Database from 'better-sqlite3';
import { openDatabase } from '@/database/open.mjs';

const globalForDatabase = globalThis as typeof globalThis & {
  rerouteDatabase?: Database.Database;
};

/** Shared server-side SQLite connection. Never import this from a Client Component. */
export const db = globalForDatabase.rerouteDatabase ?? openDatabase();

if (process.env.NODE_ENV !== 'production') {
  globalForDatabase.rerouteDatabase = db;
}
