import { openDatabase } from "./open.mjs";
import { prepareDemo } from "./demo.mjs";
const db = openDatabase();
try {
  if (db.prepare("SELECT COUNT(*) AS n FROM customers").get().n === 0)
    await import("./seed.mjs");
  else prepareDemo(db);
} finally {
  db.close();
}
