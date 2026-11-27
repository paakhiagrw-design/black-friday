import { openDatabase } from './open.mjs';
const database = openDatabase();

database.transaction(() => {
  database.exec('DELETE FROM checkout_receipts; DELETE FROM operation_refund_receipts; DELETE FROM operation_delivery_events; DELETE FROM operation_inspections; DELETE FROM operation_collections; DELETE FROM deliveries; DELETE FROM matches; DELETE FROM returns; DELETE FROM orders; DELETE FROM products; DELETE FROM customers;');
})();
database.close();
