import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const database = new Database(path.join(directory, 'reroute.db'));
database.pragma('foreign_keys = ON');
database.transaction(() => {
  database.exec('DELETE FROM deliveries; DELETE FROM matches; DELETE FROM returns; DELETE FROM orders; DELETE FROM products; DELETE FROM customers;');
})();
database.close();
