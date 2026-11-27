# Person 3 — Smart Matching & Seller Dashboard: Plan

Branch: `feature/smart-logistics` (cut from `main` @ `3b28d30`, the shared database setup)
Planner: Claude · Pair: Codex · Owner: Person 3

---

## 1. The goal

> **By build hour 2:30, a seller opens `/matches`, sees verified return #1 ranked against two nearby
> Dublin buyers with a full cost breakdown, approves the best one in a single atomic transaction, sees
> the two routes compared on a map at `/logistics`, and watches `/dashboard` and `/analytics` update.
> All seven edge-case tests pass and `npm run build` succeeds.**

That one sentence is the demo. Everything below supports it. If time runs short, cut from the bottom of
each track's list, never the approve transaction or the tests.

### ⏱ MVP cut: ready in about 30 minutes (this comes first)
The contract (`lib/logistics/{types,config,geo,costs}.ts`), `leaflet`, `vitest` and `npm test` are
**already in place**. The MVP is the goal sentence with no polish:
- **Claude:** engine + repository + `GET /api/matches` + `POST /api/reroute` + a functional `/matches` page + the 7 core tests
- **Codex agent 1:** `GET /api/dashboard` + `/dashboard` KPI tiles + `/analytics` with a working simulator
- **Codex agent 2:** `/logistics?returnId=&buyerOrderId=` Leaflet map + comparison panel
- **Out of the MVP** (polish phase): cancel reroute, charts, activity feed, dashboard tests, visual polish

When the MVP is done, continue the full task lists in §5.

### Definition of done

- [ ] Matching engine: verified return → same-SKU, paid, unfulfilled, consented buyer orders within 10 miles, ranked by net savings
- [ ] Approve endpoint reserves the buyer order atomically, and a second approval gets HTTP 409
- [ ] Warehouse fallback shown whenever no eligible, profitable match exists
- [ ] `/matches`: every verified return, its ranked candidates, and why each rejected candidate was rejected
- [ ] `/logistics`: map with returner, buyer and warehouse; traditional vs rerouted route; clearly labelled "straight-line estimate"
- [ ] `/dashboard`: live stats from SQLite (returns, pending verification, reroutes, € saved, km saved, CO₂e)
- [ ] `/analytics`: trend and per-product breakdown, plus an interactive savings simulator
- [ ] Tests green: success, wrong SKU, distant buyer, unverified return, missing consent, unprofitable, duplicate reservation
- [ ] `npm run lint` and `npm run build` pass

---

## 2. What's already in place (checked 27 Nov)

`main` holds the six-table schema (`database/schema.sql`), `lib/db.ts` (server-only `better-sqlite3`
connection), `lib/types.ts` and a seed. Person 2's branch exists but has no commits yet. No pages or
APIs exist yet. `app/layout.tsx` is still the create-next-app default.

**The seed, run through a draft matcher (Haversine, 10 mi = 16.09 km):**

| Return | SKU | State | Candidate buyers | Expected engine result |
|---|---|---|---|---|
| #1 | RR-AUD-001 | verified, `matched`, proposed match #1 | #2 Cian 0.77 km ✅, #12 Dara 1.93 km ✅ | **Two ranked matches**: the main demo |
| #2 | RR-HOM-002 | verified, `requested` | #13 delivered | No buyer → warehouse fallback |
| #3 | RR-BAG-004 | **failed**, `rejected`, damaged | — | Not eligible (unverified) |
| #4 | RR-LGT-006 | verified, `requested` | #27 **same customer**, no consent · #26 **payment pending** | All rejected, with reasons shown |
| #5 | RR-OUT-008 | verified, `approved` | #19 delivered | No buyer → warehouse fallback |

The largest distance between any two seeded customers is 19 km, so **no seeded buyer is beyond 10
miles**. Tests build their own fixtures and don't rely on the seed for that case.

### Issues to raise with the team (see §7)
1. `database/reroute.db` **is committed** even though `.gitignore` excludes it. Every local seed run
   will create merge conflicts across all three branches.
2. Seed return #1 has `return_status='matched'` while its match is only `proposed`.
3. `return_status` has no value meaning "sent to the warehouse".

---

## 3. Design decisions (made here; open to Codex pushback in the handoff log)

### 3.1 Units
Store **kilometres** (the schema uses `distance_km`) and display **miles** in the UI. The radius is
`MAX_RADIUS_KM = 16.0934`. Money is integer **cents** everywhere, formatted as € only in the UI.

### 3.2 Eligibility
**Return is matchable when:**
- `verification_status = 'verified'`
- `return_status IN ('requested','approved','matched')`
- `condition != 'damaged'`
- the return has no `accepted` or `in_transit` match. A `proposed` match is only a suggestion and
  doesn't block matching.

**Buyer order is a candidate when:**
- it has the same `product_id`, and therefore the same SKU
- it isn't the return's own order
- `payment_status='paid'` and `fulfillment_status='unfulfilled'`

Each candidate is then checked against the rules below. A failed check is recorded as a **rejection
reason** rather than silently dropped, so the UI can explain itself:

| Reason | Rule |
|---|---|
| `same_customer` | The buyer is the person returning the item |
| `no_consent` | `reroute_consent = 0` |
| `too_far` | Haversine distance > 16.0934 km |
| `reserved` | The buyer order already has an `accepted` or `in_transit` match |
| `unprofitable` | `savings < MIN_SAVINGS_CENTS` (100) |

Orders with `payment_status != 'paid'` or `fulfillment_status != 'unfulfilled'` appear as rejected
with `not_paid` / `already_fulfilled`. This covers return #4 (payment pending).

**Ranking** is by `savings` descending, then `distanceKm` ascending, then the oldest order first.

### 3.3 Cost model (`lib/logistics/config.ts`, all values overridable by the simulator)
Warehouse is a fictional central fulfilment centre in Kildare (53.1589, -6.9096), about 50 km from
Dublin. Road distance is estimated as Haversine × `ROAD_FACTOR` 1.3, and the UI labels it as an estimate.

```
traditional = returnLeg(A→WH) + warehouseHandling + outboundLeg(WH→B)
            = (495 + 6¢·roadKm) + 400 + (495 + 6¢·roadKm)          ≈ €21–22 from Dublin
reroute     = localCourier(A→B) + inspection + customerReward
            = (350 + 90¢·roadKm) + 150 + 300                        ≈ €8.90 at 0.8 km
savings     = traditional − reroute     (matches the schema CHECK)
```
The break-even point is about 11.5 km straight-line (about 15 km by road). Buyers between there and
the 16 km radius are therefore `unprofitable`, which is realistic and easy to demo in the simulator.

**Environmental estimate:** `distanceSavedKm = road(A→WH) + road(WH→B) − road(A→B)` and
`co2SavedKg = distanceSavedKm × 0.21` (average delivery van, kg CO₂e/km). Both are always labelled "est.".

### 3.4 Status transitions owned by Person 3
All writes happen inside one `db.transaction()`:

**Approve reroute** (`POST /api/reroute`):
1. Re-load the return and buyer order, then **re-run eligibility and costing on the server**. Numbers
   sent by the client are never trusted.
2. Cancel other `proposed` matches for this return and for this buyer order.
3. If a `proposed` row exists for the same pair, upgrade it. Otherwise insert one.
   `match_status='accepted'`.
4. Set `returns.return_status='matched'` and `orders.fulfillment_status='processing'` on the buyer
   order. **This is the reservation.**
5. If the partial unique index throws `SQLITE_CONSTRAINT_UNIQUE`, return **409 `already_reserved`**.
   The index is the final guard against a race.

**Cancel reroute** (nice-to-have): allowed only while the match is `accepted`, before Person 2 has
dispatched it. It reverses step 4.

**Warehouse fallback:** read-only by default. The return shows "Recommended: standard warehouse
return" and no status is written, because the schema has no status for it. See §7 Q3.

### 3.5 Proposed hand-off with Person 2 (to confirm)
- Person 2 reads matches where `match_status='accepted'`, creates the `deliveries` row and sets the
  match and return to `in_transit`.
- On delivery, in one transaction, Person 2 sets `deliveries.delivered`, `matches.completed`,
  `returns.completed` and the buyer order to `orders.fulfillment_status='delivered'`.
- Person 3's dashboard counts realised savings from `completed` matches, and committed savings from
  `accepted` and `in_transit` matches.

---

## 4. Shared contract (written first so both tracks can start in parallel)

These modules are **pure**: they never import `lib/db.ts`, which is server-only, so client components
such as the map and simulator can use them.

```
lib/logistics/types.ts      ← contract types below (Claude writes first, ~10 min)
lib/logistics/config.ts     ← constants from §3.3
lib/logistics/geo.ts        ← haversineKm, kmToMiles, roadKm
lib/logistics/costs.ts      ← computeCosts(input, config) → CostBreakdown, routeEstimate()
lib/logistics/engine.ts     ← evaluateCandidates(return, buyers, config) → ReturnMatchResult  (pure)
lib/logistics/repository.ts ← SQL (takes a Database param; routes pass the shared `db`)
lib/logistics/simulator.ts  ← simulateSavings(inputs) for the analytics page (pure)
```

```ts
// lib/logistics/types.ts (abridged; the file is the source of truth)
export type CandidateRejection =
  | 'same_customer' | 'not_paid' | 'already_fulfilled' | 'no_consent'
  | 'too_far' | 'reserved' | 'unprofitable';

export interface CostBreakdown {
  returnLegCents: number; warehouseHandlingCents: number; outboundLegCents: number;
  traditionalCents: number;
  courierCents: number; inspectionCents: number; rewardCents: number;
  rerouteCents: number;
  savingsCents: number;            // traditional − reroute, may be negative
}
export interface RouteEstimate {
  directKm: number; viaWarehouseKm: number;   // road estimates (haversine × factor)
  distanceSavedKm: number; co2SavedKg: number; isEstimate: true;
}
export interface GeoPoint { lat: number; lng: number; label: string }
export interface MatchCandidate {
  buyerOrderId: number;
  buyer: { customerId: number; name: string; address: string } & GeoPoint;
  distanceKm: number; distanceMiles: number;  // straight-line
  costs: CostBreakdown; route: RouteEstimate;
  eligible: boolean; rejections: CandidateRejection[]; rank: number | null;
}
export type ReturnMatchState =
  | 'matchable'        // ≥1 eligible candidate
  | 'reserved'         // has accepted / in_transit match
  | 'no_match'         // verified but nothing eligible → warehouse fallback
  | 'ineligible';      // unverified / failed / damaged / terminal status
export interface ReturnMatchResult {
  returnId: number; orderId: number; condition: string;
  product: { id: number; sku: string; name: string; priceCents: number };
  returner: { customerId: number; name: string; address: string } & GeoPoint;
  warehouse: GeoPoint;
  state: ReturnMatchState; ineligibleReason?: string;
  activeMatch: { id: number; buyerOrderId: number; status: string } | null;
  candidates: MatchCandidate[];               // eligible first (ranked), then rejected
  recommendation: 'reroute' | 'warehouse';
}
export interface DashboardStats {
  totalReturns: number; pendingVerification: number; awaitingMatch: number;
  activeReroutes: number; completedReroutes: number;
  savedCents: number; committedSavingsCents: number;
  distanceSavedKm: number; co2SavedKg: number; rerouteRate: number; // 0–1
  recent: Array<{ at: string; kind: string; text: string }>;
}
```

### API contract
| Method & path | Owner | Request | Response |
|---|---|---|---|
| `GET /api/matches` | Claude | `?returnId=` optional | `{ results: ReturnMatchResult[] }` |
| `POST /api/reroute` | Claude | `{ returnId, buyerOrderId }` | `201 {match}` · `409 already_reserved` · `422 {error, rejections}` · `404` |
| `DELETE /api/reroute` | Claude (stretch) | `{ matchId }` | `200` · `409 already_dispatched` |
| `GET /api/dashboard` | Codex | — | `DashboardStats` |
| `GET /api/analytics` | Codex | `?days=30` | `{ daily: [...], byProduct: [...], funnel: {...} }` |

---

## 5. Work split: equal tracks

### Track A — Claude: engine, transactions, approval UX
| # | Task | Done when |
|---|---|---|
| A1 | `types.ts`, `config.ts`, `geo.ts`, `costs.ts` | Contract committed, so **Codex is unblocked** |
| A2 | `engine.ts` (pure eligibility + ranking) | Unit tests for all rejection reasons pass |
| A3 | `repository.ts` (read queries + approve/cancel transaction) | Integration tests on in-memory SQLite pass |
| A4 | `GET /api/matches`, `POST/DELETE /api/reroute` | curl on the seed returns two ranked candidates for #1 |
| A5 | `/matches` page + `components/logistics/MatchCard`, `CostBreakdown`, `ApproveButton` | Approve works and the UI handles 409 |
| A6 | Test suite (vitest) covering the 7 required cases + extras | `npm test` green |

### Track B — Codex: dashboard, analytics, map, simulator
| # | Task | Done when |
|---|---|---|
| B1 | `lib/dashboard/queries.ts` + `GET /api/dashboard`, `GET /api/analytics` | JSON matches the `DashboardStats` contract |
| B2 | `/dashboard`: KPI tiles, status funnel, recent activity, "Review matches" CTA | Live numbers from the seed |
| B3 | `/logistics?returnId=&buyerOrderId=`: Leaflet map with 3 markers, traditional route (A→WH→B, dashed) vs reroute (A→B, solid), legend + "straight-line estimate" label | Works for return #1 → order #2 |
| B4 | `/analytics`: trend chart, per-product savings, CO₂e | Renders from the API |
| B5 | `lib/logistics/simulator.ts` + simulator UI (returns/month, local-match %, avg distance, warehouse distance, courier rates) | Sliders update projected annual € and CO₂e live |
| B6 | Dashboard/analytics query tests + empty-state handling | Tests green and pages work on an empty DB |

### Timeline (2.5 h build)
| Time | Claude | Codex | Sync point |
|---|---|---|---|
| 0:00–0:20 | A1 contract | Read Next 16 docs, scaffold pages with mock data typed to the contract | **Contract committed** |
| 0:20–1:10 | A2, A3 | B1, B2 | Both APIs return real JSON |
| 1:10–1:50 | A4, A5 | B3 (map) | `/matches` → "View route" → `/logistics` works |
| 1:50–2:20 | A6 tests | B4, B5 | All pages linked |
| 2:20–2:30 | Lint/build, fix | Lint/build, fix | **Goal sentence demo passes** |

### Rules for working side by side
- Each track writes only its own files. Shared files are `types.ts` and `config.ts`, which Claude
  owns; Codex requests changes in the handoff log.
- Commit small and often on `feature/smart-logistics`. Pull before every commit.
- Next.js here is **16.4 with `cacheComponents: true`**. Before writing pages or route handlers,
  read `node_modules/next/dist/docs/01-app/01-getting-started/{06-fetching-data,07-mutating-data,08-caching,15-route-handlers}.md`.
  DB-reading pages are dynamic, so wrap them in `<Suspense>` or use `connection()` as the docs describe.
- Don't touch `/store /cart /orders /returns /verification /inspection /delivery /tracking`, their
  APIs, `lib/db.ts`, `lib/types.ts`, `database/*` or `app/layout.tsx`.

---

## 6. Test matrix (vitest + in-memory SQLite loaded from `database/schema.sql`)

| Case | Setup | Expect |
|---|---|---|
| Successful match | Verified like_new return, buyer 0.8 km, paid/unfulfilled/consented | eligible, rank 1, savings > 0 |
| Incorrect SKU | Buyer orders a different product | Not a candidate at all |
| Distant buyer | Buyer 25 km away | `too_far` |
| Unverified return | `verification_status='pending'` (and `'failed'`) | state `ineligible` |
| Missing consent | `reroute_consent=0` | `no_consent` |
| Unprofitable | Buyer 15 km away, or simulator config with an expensive courier | `unprofitable`, recommendation `warehouse` |
| Duplicate reservation | Approve the same buyer order twice (and two returns → one buyer) | 1st 201, 2nd 409, exactly one active match |
| Extras | Same customer, unpaid order, damaged condition, ranking order, upgrade of a seeded `proposed` row | as in §3.2 |

---

## 7. Decisions needed from teammates

| # | To | Question | Our default if no answer |
|---|---|---|---|
| Q1 | Setup owner | Untrack the database file: `git rm --cached database/reroute.db` on main? | We won't commit changes to it |
| Q2 | Person 2 | OK with the hand-off in §3.5 (who sets `in_transit`, `completed` and buyer `delivered`)? | Dashboard reads both `accepted` and `completed` |
| Q3 | All | Add `'warehouse'` to `returns.return_status` for the fallback? | Fallback is a UI recommendation only |
| Q4 | Person 1 | `orders.reroute_consent` is the **buyer's** opt-in at checkout to receive a verified return, right? | Yes, that's how we read it |
| Q5 | All | Person 3 adds `leaflet`, `@types/leaflet` and `vitest` plus a `"test"` script to `package.json`. Expect lockfile conflicts at merge; fix them with `npm install` | Proceed |
| Q6 | All | Who builds the shared nav in `app/layout.tsx`? Our routes: `/dashboard /matches /logistics /analytics` | We'll send the links to whoever owns it |
| Q7 | Setup owner | Seed return #1 is `matched` but its match is only `proposed`. Change it to `approved`? | The engine treats it as awaiting approval |

---

## 8. Handoff log (both agents append; newest at bottom)

Format: `[time] [agent] did X · next Y · needs Z`

- [0:00] Claude: plan written, branch created, DB seeded. Next: A1 contract files.
- [19:53] Claude: A2–A6 MVP done (engine.ts, repository.ts with approve+cancel, GET /api/matches, POST/DELETE /api/reroute, /matches page + MatchCard/CostBreakdown/ApproveButton, 23 vitest tests green; tsc/lint/build pass) · next: polish /matches, nav links once layout owner decides · needs: Codex /logistics to accept ?returnId=&buyerOrderId= (linked from /matches); /dashboard should link to /matches. Note: an order reserved by another return reports only 'reserved' (not 'already_fulfilled').
- [19:53] Codex: dashboard API and KPIs, six-slider simulator and route comparison MVP render on the seeded dev server · next: analytics reports, recent activity, dashboard tests and map controls · needs: none.
- [19:58] Codex: Track B polish complete with daily and per-product reporting, estimated CO₂e, recent activity, empty states, map pickers and route highlighting · next: demo from /matches or /dashboard · needs: none. TypeScript, lint, all 31 tests and production build passed. Both APIs and all three pages verified on the existing seeded dev server. Analytics uses UTC delivery dates and falls back to match creation when the delivery timestamp is unavailable.
