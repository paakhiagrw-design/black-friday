# RIP — verification and delivery integration

RIP means Return In Proximity. Tagline: “The end of unnecessary returns.” Branding changes are limited to Person 2’s workspaces; repository, database, SKU/tracking identifiers and API paths are unchanged.

## Run and review

Use the existing `npm run dev`, then open `/verification`, `/inspection`, `/delivery` or `/tracking`. No packages were added. All pages use the existing Geist font. The module stylesheet is `components/verification/workspace.css`, with unique `rip-` class and animation prefixes. The repository’s `*.css` Turbopack rule treats CSS modules as plain CSS, so explicit namespacing is intentional; no shared config or global styles were changed.

The single-retailer demo uses a shared HTTPS seller login when a private code is configured. Production seller writes require that code. Use only fictional customer data. Courier and refund actions are simulated.

## OpenAI Vision Scan

Vision Scan sends the catalogue photograph and customer upload to the OpenAI Responses API with `store: false`. Only the two images and comparison instructions are sent. Seven structured findings cover identity, appearance, colour, visible condition, damage, packaging and accessories. Evidence outside the frame can be marked inconclusive. The scan returns discrepancies, a human review recommendation, the actual model and a provider response ID. It writes no decision or inspection record.

- Set `OPENAI_API_KEY` in local server environment or Railway service variables. The default model is `gpt-4.1-mini`. Override it with `OPENAI_VISION_MODEL` only for a model supporting images and strict structured output.
- For production or Railway, set a separate random `RIP_VISION_ACCESS_TOKEN` and share it privately with sellers. Sign in to the seller workspace with username `seller` and this code. The API also accepts the code as a bearer credential. Localhost development also works with just the OpenAI key. Railway’s generated HTTPS domain is recognized automatically. For a custom domain behind a reverse proxy, set `RIP_PUBLIC_ORIGIN` to the exact public HTTPS origin without a trailing slash.
- Set `products.image_url` to the actual reference image. The storefront's decorative seed fallbacks are unsuitable for identity checks. For `returns.image_url`, the scan supports the storefront's `/api/returns/photos/<uuid>.webp` path. The application and scanner must share the same `store-uploads` directory beside the configured SQLite database.
- Both slots accept images under `public/` or HTTPS URLs on trusted hosts. Set `RIP_VISION_IMAGE_HOSTS` to a comma-separated list of exact catalogue or evidence hostnames (default `images.unsplash.com`). Server fetches reject redirects. JPEG, PNG and WebP have a 5 MiB input limit per photo.
- Per server process, identical in-flight requests share one call. Completed results are reused for one hour for the same return, model and photo bytes. The server permits two concurrent scans, a 30-second retry interval per return, and 12 provider attempts per rolling hour. Failures count as attempts. Limits and cache reset on restart and apply independently to each replica.
- Missing images return HTTP 422. Configuration, quota, access and upstream failures return explicit errors. Scanning has no effect on seller approval or mandatory physical inspection. Vision Scan requires no additional migration.

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

Person 1 supplies returns in the existing `returns` table, with a real `image_url` where available. The browser preview supports relative same-origin paths and HTTP(S) images. The server-side scanner accepts the sources described above. Missing, broken, and `images.example.test` seed images show honest evidence placeholders.

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

Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `node --experimental-strip-types --test lib/operations/workflow.test.mjs lib/operations/vision/comparison.test.mjs lib/operations/vision/origin.test.mjs` (Node 22.23+). The workflow tests use isolated SQLite fixtures and cover full delivery/refund persistence, invalid transitions, duplicates, buyer eligibility, failure fallback, validation and transaction rollback. They never modify the shared database.

The opt-in live test uses two prepared return IDs in an isolated database. Give both the same catalogue reference, then supply another view of that product for the first return and a different product for the second. Start the local server and run `RIP_LIVE_VISION=1 RIP_TEST_ORIGIN=http://127.0.0.1:3000 RIP_TEST_MATCH_ID=1 RIP_TEST_MISMATCH_ID=2 node --test lib/operations/vision/live.test.mjs`. Export the server’s seller access code in the test shell for a protected server. A cold run makes two paid OpenAI comparisons and checks that concurrent and repeated calls reuse the same provider responses.

Browser QA was performed on an isolated checkout and SQLite backup, using the production server at port 3100. The copy accepted the seeded match solely as a test fixture, then completed collection → inspection → refund → dispatch → delivered and verified persistence after refresh. The original database was not changed by QA.
