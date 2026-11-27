# ReRoute database

This folder owns the shared SQLite database for the initial single-retailer MVP. It uses `better-sqlite3`; keep database access in Node.js server code. Do not import `lib/db.ts` from a Client Component or an Edge Runtime module. `lib/db.ts` exports one process-wide connection as `db`, enables SQLite foreign keys, and applies the idempotent schema when opened.

## Setup and daily use

Both developers, after checking out the project, run:

```sh
npm install
npm run db:init
npm run db:seed
```

`db:init` creates missing tables and indexes without removing rows. `db:seed` inserts the shared demo fixture with fixed IDs and `INSERT OR IGNORE`, so rerunning it does not add duplicates. `npm run db:reset` explicitly deletes local records and repopulates the fixture. The generated `database/reroute.db` and WAL/SHM files are local and ignored by git; share schema, scripts, types, and migrations through source control, not the database file.

Import the connection only from server-side code:

```ts
import { db } from '@/lib/db';

const orders = db.prepare('SELECT * FROM orders WHERE customer_id = ?').all(customerId);
```

Use prepared statements for values and `db.transaction(...)` for related writes. When changing columns or status values, update `schema.sql`, `lib/types.ts`, seed data, and this document together. Coordinate schema edits before building feature queries against them. There are no feature-specific API routes, authentication, payment processing, or courier connections in this foundation.

## Money and MVP assumptions

Every monetary value (`products.price`, `returns.reward_amount`, and match costs/savings) is an integer number of cents. For example, `12999` means €129.99. `matches.savings` is constrained to `traditional_cost - reroute_cost`; it may be negative. Distances use kilometres. Orders are restricted to one item (`quantity = 1`) and there is one retailer; product price belongs to the catalogue.

## Tables and relationships

- **customers** stores name, unique email, Dublin address, and coordinates.
- **products** is the retailer catalogue. `sku` is unique; price is cents.
- **orders** belongs to one customer and one product. It stores one-item quantity, payment and fulfilment states, reroute consent (`0`/`1` in SQLite; boolean in application code), and creation time.
- **returns** is a request against one order. Unique `order_id` allows at most one request per order. It tracks reason, reported condition, image, verification, return/refund lifecycle, reward cents, and time.
- **matches** links one return to a prospective buyer order. It stores distance, traditional/reroute costs, savings, state, and time. Partial unique indexes allow at most one active match per return and buyer order; terminal matches remain historical.
- **deliveries** has at most one delivery per match. Tracking code is unique; collection and delivery timestamps are nullable until those events occur.

Foreign keys use `ON DELETE RESTRICT` to protect linked records. Indexes cover foreign-key lookup and common status/product lookups. Foreign-key enforcement is enabled by both scripts and the shared connection.

## Status contract

These values are constrained in SQL and mirrored as union types in `lib/types.ts`.

| Field | Allowed values |
| --- | --- |
| `orders.payment_status` | `pending`, `paid`, `refunded` |
| `orders.fulfillment_status` | `unfulfilled`, `processing`, `shipped`, `delivered`, `cancelled` |
| `returns.condition` | `unopened`, `like_new`, `good`, `fair`, `damaged` |
| `returns.verification_status` | `pending`, `verified`, `failed` |
| `returns.return_status` | `requested`, `approved`, `matched`, `in_transit`, `completed`, `rejected`, `cancelled` |
| `returns.refund_status` | `pending`, `approved`, `refunded`, `denied` |
| `matches.match_status` | `proposed`, `accepted`, `in_transit`, `completed`, `cancelled`, `failed` |
| `deliveries.delivery_status` | `pending`, `collected`, `in_transit`, `delivered`, `failed` |

`proposed`, `accepted`, and `in_transit` matches count as active. `completed`, `cancelled`, and `failed` are terminal. The seed's proposed match is fixture data, not a matching workflow.

## Demo fixture

The seed contains 20 fictional Dublin-area customers, 10 products, 30 one-item orders, five returns, one example match, and one pending delivery. Return 1 is paired with a paid, unfulfilled, consented same-SKU order about 0.7 km away. Traditional cost is €12.00 and reroute cost €4.50, saving €7.50. Other returns cover a nearby different-SKU buyer, no nearby same-SKU buyer, failed verification, and a nearby same-SKU buyer who has not consented.
