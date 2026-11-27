import Database from "better-sqlite3";
import { operations } from "../lib/operations/core.ts";
const db = new Database(process.argv[2]);
const ops = operations(db);
process.once("message", () => {
  const { receipt } = ops.refund(Number(process.argv[3]));
  db.close();
  process.send(receipt, () => process.disconnect());
});
process.send("ready");
