# RIP — Return In Proximity

The end of unnecessary returns.

RIP lets a seller route a verified return to a nearby buyer who ordered the same SKU and opted in. The storefront, OpenAI comparison, matching, physical inspection, simulated courier and refund, and savings dashboard share one SQLite database.

## Run the demo

Use Node 24 LTS, run `npm ci`, then `npm run db:init && npm run db:seed && npm run dev`. Open [the storefront](http://localhost:3000/store). Set `OPENAI_API_KEY` in your local server environment or ignored `.env.local`. Never use a public environment variable for credentials. The three-minute presentation includes a second camera angle of the reference product and an incorrect product photo. [Demo instructions](DEMO.md)

## Railway

Use one service replica, a persistent volume mounted at `/data`, build command `npm run build`, and start command `npm start`. Next uses Railway’s `PORT`. Startup applies the idempotent schema and migrations, seeds a fresh database with fictional records, and adds the presentation orders to a recognised Dublin demo fixture. Existing customer transactions survive restarts when the volume is mounted.

| Server setting | Purpose |
| --- | --- |
| `DATABASE_PATH` | Absolute SQLite filename, normally `/data/reroute.db`. Without an override, the app uses `RAILWAY_VOLUME_MOUNT_PATH` if available, then the local `database` folder. Uploaded WebPs live in `store-uploads` beside this file. |
| `OPENAI_API_KEY` | Credential for the server-side OpenAI Responses API. |
| `RIP_VISION_ACCESS_TOKEN` | Private seller password. Sign in as `seller` over HTTPS. With no password configured, production presents the fictional dataset read-only to sellers and disables paid scans. |
| `OPENAI_VISION_MODEL` | Optional vision model. Defaults to `gpt-4.1-mini`. |
| `RIP_PUBLIC_ORIGIN` | Optional exact HTTPS origin for a custom reverse proxy. Railway’s generated public domain and matching HTTPS host are supported. |
| `RIP_VISION_IMAGE_HOSTS` | Optional comma-separated list of trusted external image hosts. All bundled demo photos are local. |

For an existing installation, back up SQLite using its online backup facility and copy the associated upload directory before changing volumes. Select the existing populated file with `DATABASE_PATH`. Initialisation manages schema, it does not copy data from an old deployment into a newly attached volume. [Railway volumes](https://docs.railway.com/volumes/reference)

## Verification

Run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:store`, `npm run test:store:http`, `npm run test:operations`, and `npm run build`. The dedicated HTTP command runs the upload case skipped by the storefront unit suite. Matching and analytics use Vitest. The operations suite covers separate SQLite writers racing to refund, state transitions, fresh startup and legacy migration. [Live Vision test and API contracts](lib/operations/README.md)

The customer selector impersonates fictional shoppers for the hackathon. Seller access is a shared credential. Courier, payment and reward operations are simulated, transport costs and CO₂e are model estimates, and Vision Scan always requires human review.
