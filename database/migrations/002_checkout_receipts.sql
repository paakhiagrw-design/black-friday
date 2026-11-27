CREATE TABLE IF NOT EXISTS checkout_receipts (
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  request_key TEXT NOT NULL,
  cart_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  PRIMARY KEY (customer_id, request_key)
);
