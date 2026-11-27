# Integration brief for Codex: Person 3 × Person 2 (and Person 1)

Paste everything below the line into Codex.

---

You are doing the **pre-PR integration check** for **Person 3 (Smart Matching & Seller Dashboard)** of
**RIP — Return In Proximity** (formerly "ReRoute"). The project is a Next.js 16.4 hackathon app
(App Router, `cacheComponents: true`) with TypeScript, Tailwind 4 and `better-sqlite3`. The repo is
at `/Users/andrew/Developer/giveago/black-friday`.

The goal is to prove that Person 3's branch merges and works end to end with Person 2's branch (and
Person 1's), and to fix anything on **Person 3's side only**, before we open the PR into `main`.

## Branches (all branched from `main` @ `3b28d30`; `main` has not moved since)
- `feature/smart-logistics`: **Person 3 (ours)**, pushed at `eae3963`
- `origin/feature/verification-delivery`: Person 2, `be00857`
- `origin/feature/ecommerce-returns`: Person 1, `d42ec21`

A trial `git merge-tree` already showed:
- Person 2 merges into ours **with no conflicts**. There are no shared files.
- Person 1 conflicts only in **`package.json`**. Keep both sides: our `test` script plus their
  `test:store` and `test:store:http` scripts, and our `leaflet`/`vitest`/`@types/leaflet` plus their
  `sharp`. Then regenerate the lockfile with `npm install`. Their `AGENTS.md` change is the
  auto-generated agent-feedback block; accept it.

## Work in an isolated worktree, not the main checkout
The main checkout has a dev server on :3000 and a locally modified `database/reroute.db`. Don't
touch either.
```
git fetch origin
git worktree add ../black-friday-integration -b integration/p3-check feature/smart-logistics
cd ../black-friday-integration
git merge --no-ff origin/feature/verification-delivery -m "Integration check: merge Person 2"
git merge --no-ff origin/feature/ecommerce-returns   -m "Integration check: merge Person 1"   # resolve package.json as above
npm install && npm run db:reset
```
The worktree has its own `database/reroute.db`, so test freely there. Run its dev or prod server on
**port 3100**. **Never push `integration/p3-check`**; it's a scratch branch.

## Use two sub-agents in parallel
- **Sub-agent A: contracts and code review** (read-only at first). Check each item in the contract
  table below against the merged code, and draft the Person 3 fixes.
- **Sub-agent B: browser end-to-end QA** in the worktree on :3100. Run the full cross-module journey
  below and review the rendered UI.

You, the lead, apply the fixes (see "Where to make fixes"), re-merge, re-test, and write the report.

## Contract table (Person 2's rules are in their `lib/operations/README.md`)
| # | Handoff | Expected | Check |
|---|---|---|---|
| 1 | P2 verification approve → P3 matching | P2 sets `verification_status=verified`, `return_status=approved`. Our engine accepts `requested/approved/matched` | Approve a pending return in `/verification` and confirm it appears on `/matches` |
| 2 | P3 approve → P2 collection | We set the match to `accepted`, the return to `matched` and the buyer order to `processing`. P2 requires `match_status=accepted`, and a buyer order in `unfulfilled`/`processing` | Approve on `/matches`, then arrange collection on `/delivery` |
| 3 | Seed match #1 | The seed has a **proposed** match #1 plus a **pending delivery** for it. Our approve upgrades it to `accepted`, and P2 reuses that pending delivery | No duplicate delivery; the tracking code `RR-DEMO-0001` is reused |
| 4 | P2 dispatch/deliver → P3 dashboard | P2 sets the match to `in_transit` then `completed`, the return to `completed` and the buyer order to `delivered` | After delivery, `/dashboard` realised savings, km saved, CO₂ and `/analytics` byProduct become non-zero |
| 5 | **P2 failed inspection** | P2 sets the delivery and match to `failed` and the return to `failed/rejected`, but **leaves the buyer order at `processing`** | **Known gap:** that buyer order can never be matched again (our engine sees `already_fulfilled`). Confirm it, then see the fixes |
| 6 | **P3 cancel reroute vs P2 collection** | Our `cancelReroute` allows cancelling while the match is `accepted`, but P2 schedules collection while the match is still `accepted` | **Gap:** cancelling after collection is arranged leaves an orphaned delivery. See the fixes |
| 7 | P1 checkout → P3 consent | P1 inserts orders as `paid/unfulfilled` with `reroute_consent` from the buyer's checkbox | Buy the same SKU as a delivered order with consent on, return the delivered one, verify it, and confirm the new buyer appears on `/matches` |
| 8 | P2 migration | `database/migrations/001_verification_delivery.sql` adds 4 `operation_*` tables, applied when P2's `lib/operations/server.ts` is first imported | Our queries must not assume those tables exist (guard with `sqlite_master` if you read them) |
| 9 | Global CSS | P1 (`components/store/*.css`) and P2 (`components/verification/workspace.css`) import plain global CSS | Navigate store → `/dashboard`, `/verification` → `/matches`, and similar. Confirm none of their selectors restyle Person 3 pages, and none of ours restyle theirs |
| 10 | Routes | P1 deleted `app/page.tsx` and moved `/` into `app/(shop)/page.tsx` | Build has no route collisions; all 12+ routes render |

## The full journey (sub-agent B, on :3100)
1. Store: as one customer, buy SKU X with consent ticked. As another customer nearby who already has
   a delivered SKU X order, request a return with a photo.
2. `/verification`: approve the new return.
3. `/matches`: the new buyer is ranked; approve the reroute. A second approve gets a 409 message.
4. `/logistics?returnId=…&buyerOrderId=…`: map, costs and CO₂ shown.
5. `/delivery`: arrange collection, then collect. `/inspection`: pass. `/tracking`: dispatch,
   deliver, refund.
6. `/dashboard` and `/analytics`: realised savings, km and CO₂ updated. `/orders` in the store shows
   the buyer's order as delivered.
7. Repeat with a failed inspection, and confirm gap #5.
8. Also run the seeded cases: return #1 → match, #2/#4/#5 → warehouse fallback, #3 → ineligible.

## Where to make fixes
- **Only edit Person 3 files.** Those are `lib/logistics/**`, `lib/dashboard/**`, `app/{dashboard,matches,logistics,analytics}/**`,
  `app/api/{dashboard,matches,reroute,analytics}/**`, `components/{dashboard,logistics}/**`,
  `docs/smart-logistics/**`, and `vitest.config.mts`.
- Make fixes **in the main checkout on `feature/smart-logistics`**, at
  `/Users/andrew/Developer/giveago/black-friday`. Commit them locally there, staging explicit paths
  and **never `database/reroute.db`**. Then run `git merge feature/smart-logistics` inside the
  worktree and re-test. **Don't push.** The user pushes after review.
- **Never edit Person 1 or Person 2 files**, `lib/db.ts`, `lib/types.ts`, `database/schema.sql` or
  `database/seed.mjs`. Never commit `.db` or `.env` files.

**Expected Person 3 fixes:**
- **Gap #6:** `cancelReroute` must return `409 already_dispatched` once Person 2 has scheduled
  collection. That's when a row exists in `operation_collections` (guard for the table being
  missing) or the delivery status isn't `pending`. Add a test.
- **Gap #5:** the clean fix is in Person 2's module: in the failed-inspection transaction, run
  `UPDATE orders SET fulfillment_status='unfulfilled' WHERE id=? AND fulfillment_status='processing'`.
  **Don't edit their file.** Write the exact patch into the report for Person 2. Only if they can't
  take it, propose (don't apply) an engine-side fallback.
- **Branding:** the product is now "RIP — Return In Proximity". Update user-visible "ReRoute" text
  in Person 3 pages, titles and metadata to match. Leave identifiers, SKUs and tracking codes alone.
- **Cross-links:** on a reserved match card in `/matches`, add an "Arrange collection" link to
  `/delivery`. Add links from `/dashboard` to `/verification` and `/delivery`, so the seller journey
  flows.
- **Map zoom:** `/logistics` currently zooms out to all of Ireland. Make it fit Dublin and Kildare
  tightly.
- Fix any visual, interaction or animation problems sub-agent B finds on Person 3 pages.

## Done means
In the worktree, all of these pass:
- `npx tsc --noEmit`
- `npm run lint`
- `npm test` (our vitest)
- `npm run test:store` (Person 1's tests)
- `node --experimental-strip-types --test lib/operations/workflow.test.mjs` (Person 2's tests)
- `npm run build`
- the full journey above, in a browser

## Report back
- List each Person 3 commit made on `feature/smart-logistics`, with the files it changed.
- Give the contract table with ✅/❌ per row.
- Give the exact patch and message for Person 2 (gap #5), and anything else for Person 1 or 2.
- Give the `package.json` resolution to use when the real PRs merge.
- List any remaining integration issues, ranked.
- Leave the worktree in place and tell me its path.
