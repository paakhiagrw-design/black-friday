import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const database = new Database(path.join(directory, 'reroute.db'));
database.pragma('foreign_keys = ON');
database.pragma('journal_mode = WAL');
database.exec(readFileSync(path.join(directory, 'schema.sql'), 'utf8'));
database.close();
console.log('ReRoute database initialised (existing records preserved).');
