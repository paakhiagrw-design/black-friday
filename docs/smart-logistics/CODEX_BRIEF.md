# Brief for Codex: Person 3, Track B

Paste everything below the line into Codex.

---

We are building **ReRoute**, a reverse-logistics platform, at a hackathon. The stack is
**Next.js 16.4** (App Router, `cacheComponents: true`), TypeScript, Tailwind CSS 4, and SQLite via
`better-sqlite3`. The repo is at `/Users/andrew/Developer/giveago/black-friday`, on branch
`feature/smart-logistics`.

You are pairing with **Claude** on **Person 3: Smart Matching & Seller Dashboard**. Claude owns
**Track A**: the matching engine, the approve/reserve transaction, `/api/matches`, `/api/reroute`
and the `/matches` page. **You own Track B**: the seller dashboard, analytics, the savings simulator
and the route-comparison map. **We need a working MVP in about 30 minutes**, then polish.

## Run two sub-agents in parallel
You're the lead. Spawn two sub-agents with **separate file sets** (listed below) so they never
collide. You review their output, run the checks, and fix anything that falls between them.

### Sub-agent 1: Dashboard + Analytics + Simulator
Files: `lib/dashboard/**`, `lib/logistics/simulator.ts`, `app/api/dashboard/**`,
`app/api/analytics/**`, `app/dashboard/**`, `app/analytics/**`, `components/dashboard/**`

MVP (do first):
- `lib/dashboard/queries.ts`: functions take a `Database` (`better-sqlite3`) parameter.
  `getDashboardStats(db): DashboardStats` (type in `lib/logistics/types.ts`):
  - total returns
  - pending verification (`verification_status='pending'`)
  - awaiting match (verified, `return_status` in `requested`/`approved`, no active match)
  - active reroutes (`match_status` in `accepted`/`in_transit`)
  - completed reroutes
  - saved cents (sum of savings on `completed` matches)
  - committed savings (sum on `accepted` + `in_transit`)
  - distance saved and CO₂e: compute per match from customer coordinates using `legDistances` +
    `routeEstimate` from `lib/logistics/costs.ts`
  - reroute rate
- `GET /api/dashboard` returns `DashboardStats`. Use the shared `db` from `@/lib/db`.
- `/dashboard`: a premium seller dashboard. KPI tiles (€ formatted from cents, km shown in miles,
  CO₂e labelled "est."), a simple return-status funnel, and buttons to `/matches` and `/analytics`.
- `lib/logistics/simulator.ts`: `simulateSavings(inputs: SimulatorInputs): SimulatorOutputs`. It must
  be **pure** and built on `computeCosts` / `routeEstimate`, so the simulator and the engine always agree.
- `/analytics`: an interactive savings simulator (a client component with sliders for returns/month,
  local match %, average match distance, warehouse distance, courier per-km rate and reward) showing
  monthly/annual € saved, km and CO₂e live.

Polish (after MVP):
- `GET /api/analytics` (daily savings, per-product breakdown)
- simple charts and a recent-activity feed
- vitest tests in `lib/dashboard/queries.test.ts` using in-memory SQLite loaded from `database/schema.sql`
- empty-database states

### Sub-agent 2: Route map
Files: `app/logistics/**`, `components/logistics/map/**`, `lib/logistics/routeView.ts`

MVP (do first):
- `/logistics?returnId=&buyerOrderId=`: a server part loads the returner (the customer on the
  return's order), the buyer (the customer on `buyerOrderId`) and the product from SQLite. Put the
  DB-reading code in `lib/logistics/routeView.ts`, which takes a `db` param. The warehouse comes
  from `DEFAULT_COST_CONFIG.warehouse`.
- A client Leaflet map (`components/logistics/map/RouteMap.tsx`). Import `leaflet` dynamically
  inside `useEffect` (it touches `window`) and include `leaflet/dist/leaflet.css`. Use OpenStreetMap
  tiles with attribution. Draw:
  - 3 markers: returner, buyer, warehouse
  - **traditional route** returner → warehouse → buyer as a dashed grey polyline
  - **ReRoute** returner → buyer as a solid green polyline
  - fit bounds to all points
- A comparison panel built from `legDistances`, `computeCosts` and `routeEstimate`: km (shown in
  miles), € cost of each route, savings, CO₂e saved. Add a visible note: **"Straight-line distances
  with a 1.3× road factor: estimates, not actual road routing."**
- If no params are given, default to `returnId=1&buyerOrderId=2` (the seeded demo pair). Show a
  clear message if either ID doesn't exist.

Polish (after MVP):
- a return/buyer picker
- a toggle to highlight each route
- a marker legend
- a fallback when map tiles can't load

## Already done by Claude (use these, don't edit them)
- `lib/logistics/types.ts`: `DashboardStats`, `SimulatorInputs/Outputs`, `CostConfig`,
  `CostBreakdown`, `RouteEstimate`, and more
- `lib/logistics/config.ts`: `DEFAULT_COST_CONFIG`, `MAX_RADIUS_KM`, `resolveConfig()`
- `lib/logistics/geo.ts`: `haversineKm`, `kmToMiles`, `roadKm`, `round`
- `lib/logistics/costs.ts`: `legDistances`, `computeCosts`, `routeEstimate`
- `leaflet`, `@types/leaflet` and `vitest` are installed, and `npm test` runs `vitest run`. **Don't
  run `npm install <pkg>` or edit `package.json`.** If you need a package, ask in the handoff log.

If a contract type needs to change, write it in the handoff log rather than editing the file.

## Read before coding
1. `docs/smart-logistics/PLAN.md`: the goal, design decisions (§3: units, cost model, statuses) and
   the contract (§4)
2. `database/schema.sql`, `database/README.md`, `lib/types.ts`, `lib/db.ts`
3. This Next.js differs from your training data. Read
   `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` (around line 335 and 416)
   and `15-route-handlers.md`. Synchronous `better-sqlite3` reads count as uncached data: in pages,
   call `await connection()` (from `next/server`) before querying, inside a component wrapped in
   `<Suspense>`.

## Hard rules
- **Claude works in this same folder at the same time.** Don't run `git stash`, `git checkout`,
  `git reset`, `git pull` or `git clean`, and **don't commit**. The user commits.
- Touch only the files listed for your sub-agents. Never edit:
  - Claude's files: `lib/logistics/{types,config,geo,costs,engine,repository}.ts`, `app/matches`,
    `app/api/matches`, `app/api/reroute`, `components/logistics/*.tsx` outside `map/`
  - other teams' modules (`/store /cart /orders /returns /verification /inspection /delivery /tracking`)
  - `lib/db.ts`, `lib/types.ts`, `database/*`, `app/layout.tsx`, `app/globals.css`, `package.json`
- Money is integer cents in code and the DB, formatted as € in the UI only. Distances are stored in
  km and shown in miles.
- Never import `@/lib/db` into a client component or a pure `lib/logistics/*` module.
- Consistent look: Tailwind, neutral surfaces, an emerald accent for savings/ReRoute, slate for
  traditional. Responsive.
- After each milestone, append to `docs/smart-logistics/PLAN.md` §8:
  `[time] Codex: did X · next Y · needs Z`.
- Done means `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` all pass. Also curl
  `/api/dashboard` and open `/dashboard`, `/analytics` and `/logistics` on `npm run dev` to check
  they render with the seeded data. If the dev server is already running on port 3000, reuse it.
