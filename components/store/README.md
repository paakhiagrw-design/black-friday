# RIP customer module

Work lives on `feature/ecommerce-returns`. Start with `npm install`, `npm run db:init`, `npm run db:seed`, then `npm run dev` and open `/store`. All catalogue/customer/order data comes from the existing shared SQLite database. Shared schema, shared types, root layout, global styles and the other teams' modules are unchanged. The `(shop)` route group supplies its own layout, metadata, provider and scoped CSS. The root `/` introduces RIP (Return. In Proximity.) inside the same customer route group; `/store` opens the catalogue.

## API contract

- `GET /api/products`: `{products, customers, customer_id}` from SQLite. `POST /api/products` with `{customer_id}` selects a seeded demo customer in an HttpOnly, SameSite cookie.
- `POST /api/checkout`: `{items: [{product_id, quantity}], consent: boolean}`. Server calculates prices, validates products and quantities, and creates all order rows in one transaction. Each unit is a separate `quantity=1` order to respect the shared MVP constraint. Response: `{order_ids, total}` in cents. New orders are `paid`, `unfulfilled`, and `reroute_consent=0|1`. Consent is unchecked initially; no real money is charged.
- `GET /api/orders`: selected customer's `{orders}` with catalogue fields, return state and available delivery/tracking details. Ownership is derived from the demo cookie; customer IDs supplied in query/body do not override it.
- `GET /api/returns`: selected customer's `{returns}` including verification/refund status and notes.
- `POST /api/returns`: multipart fields `order_id`, `reason` (5–1000 characters), `condition` (existing shared enum) and required `photo`. Only the selected customer's paid, delivered orders without a return are eligible. Checks and insert run in a transaction; the schema's unique `order_id` enforces duplicate protection. New rows use `verification_status=pending`, `return_status=requested`, `refund_status=pending`, and the existing zero reward default.
- Photos accept JPG, PNG and WebP up to 5 MiB. Sharp decodes, strips metadata, resizes and re-encodes them to WebP under `database/store-uploads/`. `returns.image_url` holds `/api/returns/photos/<uuid>.webp`, usable by Person 2. Failed submissions clean up their files. The photo route is intentionally available without a customer cookie so the hackathon verification module can retrieve it.

The customer selector is a demo identity mechanism, not authentication. It deliberately lets testers switch accounts. Production authentication and staff permissions are outside this module. Browsers keep a separate local cart per customer. Selecting a different customer switches both account history and cart.

## Team handoff

Person 2 reads pending rows in `returns` and their `image_url`, then updates verification fields using the agreed statuses. Person 3 reads paid/unfulfilled orders with `reroute_consent=1` and matching `product_id`; this module does not create matches or deliveries. The returns screen provides a refresh button to read their updates.

No schema/type blockers remain. Local SQLite files and uploaded photos are specific to a running app instance: teammates need to use the same server/database and upload directory to see newly submitted data. Git pulls do not synchronize live submissions. A deployed instance requires a writable persistent disk. Uploads are ignored by git.

Seed product image URLs use `images.example.test`; the customer image component substitutes illustrative Unsplash photography by existing SKU without changing the seeded catalogue. These are presentation assets, not a second product dataset. Real catalogue image URLs take precedence; an accessible placeholder appears if an image fails. Photography needs internet access.

## Verification

- `npm run lint`
- `npm run test:store` (Node 22.6+ for TypeScript stripping; service tests use in-memory copies of actual shared records; the HTTP test is skipped unless a target URL is explicitly supplied).
- `npm run test:store:http` starts a temporary isolated copy on port 3107, runs the actual APIs, then removes the copy. Set `STORE_TEST_PORT` if needed. It never inserts into the working database.
- `npm run build`; if this host's Turbopack CSS worker cannot bind its port, `npm run build -- --webpack` uses the supported alternative bundler without changing shared configuration.

Verified HTTP scenario on seeded data: Aoife Byrne (customer 1) returns delivered order 21, the Wool Blend Throw (`RR-HOM-010`), with a valid uploaded image. Its reference is readable and verification is pending. Cian Murphy (customer 2) buys two units of the same SKU with consent; two paid/unfulfilled order rows are created. These customers are nearby in the seed. Duplicate return, wrong owner, invalid image, missing identity, invalid quantities, unconsented checkout, server-side totals and transactional rollback are covered. Seed order 1 already has a return and must not be used as the new-return demo.

Browser interaction/visual QA could not run because local browser access was unavailable in this chat. Responsive styles and loading, empty, error and success states are implemented; review them at desktop/mobile widths before presenting.

## Storefront styling

Customer styles use explicit `rr-store-` class names in `store.css`, imported by the shop layout. The existing Turbopack Tailwind loader rewrites CSS Module filenames as ordinary CSS, so importing a `.module.css` object produced missing HTML class names. This module avoids that rewrite issue without changing shared Next configuration. Verified the live Turbopack page includes namespaced classes and delivers matching styles. Catalogue category and price-sort controls filter the shared products in the browser.

## RIP identity, theme and product story

The intro replaces the root starter page by moving `/` into `app/(shop)/page.tsx`. No shared root layout or global CSS changes were needed. Customer metadata, navigation and display text use RIP / Return. In Proximity.; internal database names and storage keys remain compatible.

`polish.css` layers customer-only design tokens over the existing namespaced styles. Appearance offers System (first-visit default), Light and Dark. `rip-theme` in localStorage persists explicit choices and synchronizes across tabs; CSS follows system changes when System is selected. If browser storage is unavailable, selection applies to the current page without persistence.

The intro features the actual catalogue headphones (name, description and price from `/api/products`). On desktop a bounded, three-caption story keeps the image sticky and updates its scale with a passive scroll listener and requestAnimationFrame. At widths below 900px, and whenever reduced motion is enabled, the image is static and the text is fully visible. Listeners are cleaned up on navigation. No animation library or second dataset was added.

Demo walkthrough: open `/`, follow the product story, use Shop the collection, and switch Appearance. Select Aoife to inspect delivered purchases or submit a photo return for order 21 if it has no existing return. Select Cian to add that same product to the bag and check out with consent. Service and isolated HTTP checks pass; desktop/mobile visual interaction and theme persistence still need a manual browser check because the browser-control tool was unavailable.
