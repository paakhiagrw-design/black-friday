# RIP release verification

The local production test used a disposable SQLite file, a separate upload directory, public product photographs and two real OpenAI Responses API calls. The public customer selector check only changes a browser cookie.

| Area | Result | Observed evidence |
| --- | --- | --- |
| Storefront and checkout | PASS | Chromium selected Cian Murphy, added the Raspberry Pi to the bag, opted in and checked out. SQLite recorded a paid, unfulfilled order. Replaying a checkout key returned the same order IDs. |
| Return upload and queue | PASS | Aoife and Niamh each selected a delivered purchase and submitted a real photograph. Both persisted as pending returns, both WebPs were retrievable, and both appeared in verification. |
| OpenAI comparison | PASS | `gpt-4.1-mini-2025-04-14` identified two views of the Pi as consistent and a keyboard as a different product. The browser displayed seven delayed findings and kept the scan line active while waiting. Cached repeats retained each original response ID. |
| Seller decision | PASS | Manual approval made Aoife’s return eligible. Manual exclusion left Niamh’s refund pending. Scanning alone changed neither record. |
| Smart matching | PASS | Same product, paid order, buyer consent, unfulfilled status and 0.767 km direct distance qualified Cian. Warehouse €21.41 versus direct €8.90 yielded €12.51. Approval reserved the order and a second approval returned HTTP 409. |
| Collection and inspection | PASS | The accepted match appeared in Delivery. Scheduling produced a unique tracking reference. Dispatch before inspection returned 409. All five checks, the exact SKU and notes were required to pass. Failure terminated the local journey and released the reserved buyer. |
| Refund, reward and delivery | PASS | The UI issued one €65.00 simulated refund plus €3.00 reward. Four independent SQLite connections racing to refund a separate fixture received one persisted receipt. Dispatch and delivery updated the order, match and return. |
| Dashboard and analytics | PASS | Realised savings came from the completed match. Route estimates added 124.21 km and 26.08 kg CO₂e. Dashboard refresh retained the results. Analytics aggregation and time windows passed the repository tests. |
| Negative paths | PASS | Tested damaged products, absent photos, wrong photos and SKUs, missing consent, radius and profit exclusions, empty candidate sets, duplicate reservations and refunds, failed inspection, invalid tracking and invalid transitions. A separate failure-injection server returned the upstream OpenAI rate-limit error and enforced the local retry cooldown. An invalid seller credential was denied. |
| Frontend | PASS | All 13 pages rendered at 1536 px and 390 px. Browser checks found no horizontal document overflow, broken images or page exceptions. The route-map controls and both route overlays worked. |
| Database compatibility | PASS | Fresh startup, repeated seeding, repeat migrations on a backup of the historic database, foreign-key checks and preserving the original order/return rows passed. |
| Linux and persistent storage | PASS | Native SQLite and Sharp ran on Node 24 Linux. The production build started on injected PORT 8080. A return and its actual uploaded WebP survived a container restart with the mounted /data directory. |
| Public Railway volume and provider credentials | NOT TESTED | The local Railway account lacked project administration access. The public site alone cannot attest to either the production volume mount or the provider key. |

## Integration corrections

The storefront now shares the public-origin check used by verification. The scanner and storefront use the same upload directory beside the configured database. Startup applies both modules’ schema before requests arrive. The seed recognises the original fictional fixture, upgrades its placeholder images and provides two delivered purchases for the live demo.

Matching persists the reward used in its cost calculation. Failed inspection releases a processing buyer order. Invalid tracking references show an explicit empty state. Checkout replays use a customer-scoped receipt. The upload handler caps the body before parsing multipart data and verifies the decoded image format. The seller workspace protects production writes and paid scans, and the customer list omits unused email and location coordinates.

Seller pages share dark surfaces and navigation. Product photos and fonts ship with the build. External map tiles still depend on OpenStreetMap availability, and distance and emissions remain estimates.

## Scope

The customer selector deliberately impersonates fictional shoppers. Production customer identity, real payment processing, real carrier dispatch and measured transport emissions are outside this hackathon demonstration. Physical inspection was exercised as a human-operated software checklist. No physical shipment took place.
