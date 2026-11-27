-- Person 2 additive migration. Approved 2026-11-27. Existing statuses unchanged.
CREATE TABLE IF NOT EXISTS operation_inspections (
  id INTEGER PRIMARY KEY,
  delivery_id INTEGER NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE RESTRICT,
  outcome TEXT NOT NULL CHECK (outcome IN ('passed','failed')),
  checks_json TEXT NOT NULL,
  sku_confirmed TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS operation_collections (
  delivery_id INTEGER PRIMARY KEY REFERENCES deliveries(id) ON DELETE RESTRICT,
  method TEXT NOT NULL CHECK (method IN ('courier','locker')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS operation_delivery_events (
  id INTEGER PRIMARY KEY,
  delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE RESTRICT,
  event TEXT NOT NULL CHECK (event IN ('scheduled','collected','inspection_passed','inspection_failed','in_transit','delivered')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(delivery_id,event)
);
CREATE TABLE IF NOT EXISTS operation_refund_receipts (
  return_id INTEGER PRIMARY KEY REFERENCES returns(id) ON DELETE RESTRICT,
  reference TEXT NOT NULL UNIQUE,
  refund_amount INTEGER NOT NULL CHECK(refund_amount >= 0),
  reward_amount INTEGER NOT NULL CHECK(reward_amount >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
