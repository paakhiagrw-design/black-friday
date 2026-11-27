# RIP — verification and delivery integration

RIP means Return In Proximity. Tagline: “The end of unnecessary returns.” Branding changes are limited to Person 2’s workspaces; repository, database, SKU/tracking identifiers and API paths are unchanged.

## Run and review

Use the existing `npm run dev`, then open `/verification`, `/inspection`, `/delivery` or `/tracking`. No packages were added. All pages use the existing Geist font. The module stylesheet is `components/verification/workspace.css`, with unique `rip-` class and animation prefixes. The repository’s `*.css` Turbopack rule treats CSS modules as plain CSS, so explicit namespacing is intentional; no shared config or global styles were changed.

This is the existing unauthenticated, single-retailer local demo. Do not expose the operations APIs publicly until the team adds seller/inspector authorization. Same-origin checks on browser writes are CSRF protection, not authentication. No real courier, payment or vision provider is connected. Vision Scan is a deterministic evidence-readiness assessment and never claims to analyse photographs. Its labelled scan animation is a visual demonstration, does not delay the response, and respects reduced motion.

## Approved additive migration

`database/migrations/001_verification_delivery.sql` was approved on 2026-11-27. The operations server applies it idempotently, in a transaction, to the existing `lib/db.ts` connection. No status unions, existing tables, seed records, or shared types are changed.

| Added table                 | Durable purpose                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `operation_collections`     | One collection method per delivery, with scheduling timestamp                                       |
| `operation_inspections`     | One final physical inspection per delivery: checklist JSON, observed SKU, notes, outcome, timestamp |
| `operation_delivery_events` | Unique event per delivery and event name, with timestamp                                            |
| `operation_refund_receipts` | One simulated receipt per return: refund/reward cents, unique transaction reference, timestamp      |

Schema is also usable manually with `sqlite3 database/reroute.db < database/migrations/001_verification_delivery.sql`. Keep this migration with the module. The tracked `database/reroute.db` and WAL/SHM files must never be staged with source changes.

## Team contracts

Person 1 supplies returns in the existing `returns` table, with a real `image_url` where available. Relative same-origin image paths and HTTP(S) images are supported. Missing, broken, and `images.example.test` seed images show honest evidence placeholders.

Seller approval sets `verification_status=verified` and `return_status=approved`. It changes only those fields and `verification_notes`. Person 3 can discover these returns using those states. Review sets `pending/requested`; exclusion sets `failed/rejected`. Neither changes the refund status. Verification cannot alter a return with an active match or one already beyond the verification stage.

Person 3 owns creation and acceptance of matches. Collection requires `match_status=accepted`, verified return, same SKU, paid receiving order, reroute consent, and unfulfilled/processing receiving order. The module never creates or accepts a match. A pre-existing pending delivery is reused; `deliveries.match_id` uniqueness prevents duplicates. The original seed has a **proposed** match and a pending delivery, so collection correctly stays blocked until the matching team accepts that match.

| User action            | Existing state updates                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Arrange collection     | Create/reuse pending delivery; approved return becomes matched                                                   |
| Simulate collection    | Delivery pending → collected; record `collected_at`                                                              |
| Pass inspection        | Delivery stays collected; final inspection/event persisted in additive tables                                    |
| Fail inspection        | Delivery failed; match failed; return failed/rejected; refund state preserved                                    |
| Simulate dispatch      | Delivery and match in_transit; return in_transit; buyer order shipped                                            |
| Simulate delivery      | Delivery delivered; match completed; return completed; buyer order delivered                                     |
| Issue simulated refund | Returning order refunded; return refund_status refunded; receipt stores catalogue price + existing reward_amount |

There is no shared warehouse-shipment status or warehouse booking service. A failed inspection is the standard-return handoff: local delivery is permanently blocked, the UI explains the warehouse fallback, and the returns team must continue its normal warehouse/refund review. The module does not invent or book warehouse transport. Existing seeded `refund_status=denied` values are displayed as historical records and are not changed by verification.

The original schema has no immutable paid-price field. Refund amount therefore uses `products.price` (the existing single-item MVP contract) and the return’s assigned `reward_amount`. A receipt freezes those amounts at issue time. Repeat requests return the existing receipt, even after catalogue values change. No bonus is silently invented for returns whose assigned reward is zero.

## API contract

Every GET returns `{ returns: ReturnView[] }` or `{ deliveries: DeliveryView[] }`. Requests are uncached and the UI refreshes every 10 seconds while visible. No customer emails or street addresses are returned. Delivery coordinate data is used only for the seller route illustration; it is not a road route or a live courier position.

All POST bodies are JSON objects. IDs must be positive integer numbers. Errors return `{ error: string }` with 400 for validation, 403 for cross-origin writes, 404 for unknown IDs, 409 for invalid/duplicate transitions, 413 for excessive payload, or 415 for wrong content type. Database operations are parameterized and related changes use immediate transactions.

| API                 | POST body                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/verification` | `{ returnId, action: "scan" }` → `{ assessment }`                                                                                          |
| `/api/verification` | `{ returnId, action: "approve" \| "review" \| "reject", notes }` → `{ return }`                                                            |
| `/api/delivery`     | `{ matchId, method: "courier" \| "locker" }` → `{ delivery }`                                                                              |
| `/api/inspection`   | `{ deliveryId, outcome: "passed" \| "failed", sku, notes, checks: { identity, sku, condition, packaging, accessories } }` → `{ delivery }` |
| `/api/tracking`     | `{ deliveryId, action: "advance", status: "collected" \| "in_transit" \| "delivered" }` → `{ delivery }`                                   |
| `/api/tracking`     | `{ deliveryId, action: "refund" }` → `{ delivery }` with idempotent receipt                                                                |

Inspection checks are booleans; pass requires all five true, exact observed SKU and notes. Failure requires notes and a valid checklist. Photos cannot substitute for physical or functional checks. Successful inspection requires an already collected, accepted, scheduled delivery.

## Verification

Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `node --experimental-strip-types --test lib/operations/workflow.test.mjs` (Node 22.23+). The workflow tests use isolated SQLite fixtures and cover full delivery/refund persistence, invalid transitions, duplicates, buyer eligibility, failure fallback, validation and transaction rollback. They never modify the shared database.

Browser QA was performed on an isolated checkout and SQLite backup, using the production server at port 3100. The copy accepted the seeded match solely as a test fixture, then completed collection → inspection → refund → dispatch → delivered and verified persistence after refresh. The original database was not changed by QA.
