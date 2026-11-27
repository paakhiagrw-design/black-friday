PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  image_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity = 1),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')),
  reroute_consent INTEGER NOT NULL DEFAULT 0 CHECK (reroute_consent IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('unopened', 'like_new', 'good', 'fair', 'damaged')),
  image_url TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_notes TEXT NOT NULL DEFAULT '',
  return_status TEXT NOT NULL DEFAULT 'requested' CHECK (return_status IN ('requested', 'approved', 'matched', 'in_transit', 'completed', 'rejected', 'cancelled')),
  refund_status TEXT NOT NULL DEFAULT 'pending' CHECK (refund_status IN ('pending', 'approved', 'refunded', 'denied')),
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,
  return_id INTEGER NOT NULL REFERENCES returns(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  buyer_order_id INTEGER NOT NULL REFERENCES orders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  distance_km REAL NOT NULL CHECK (distance_km >= 0),
  traditional_cost INTEGER NOT NULL CHECK (traditional_cost >= 0),
  reroute_cost INTEGER NOT NULL CHECK (reroute_cost >= 0),
  savings INTEGER NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'proposed' CHECK (match_status IN ('proposed', 'accepted', 'in_transit', 'completed', 'cancelled', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (savings = traditional_cost - reroute_cost)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY,
  match_id INTEGER NOT NULL UNIQUE REFERENCES matches(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  tracking_code TEXT NOT NULL UNIQUE,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'collected', 'in_transit', 'delivered', 'failed')),
  collected_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_fulfillment ON orders(product_id, fulfillment_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(verification_status, return_status);
CREATE INDEX IF NOT EXISTS idx_matches_return_id ON matches(return_id);
CREATE INDEX IF NOT EXISTS idx_matches_buyer_order_id ON matches(buyer_order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(delivery_status);

-- Only one live match may use a return or buyer order. Completed and terminal
-- matches are historical and do not prevent future matching.
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_one_active_return
  ON matches(return_id) WHERE match_status IN ('proposed', 'accepted', 'in_transit');
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_one_active_buyer
  ON matches(buyer_order_id) WHERE match_status IN ('proposed', 'accepted', 'in_transit');
