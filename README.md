# ShopSphere: Multi-Vendor Marketplace + Digital Khata

A Daraz-style multi-vendor marketplace with a built-in Easy Khata-style credit ledger for shopkeepers.
One account can buy, and after opening a shop, sell (Seller Mode). Roles: Guest, Buyer, Seller, Delivery Partner, Admin.

- **Stack:** Next.js 15 (App Router) + TypeScript, Tailwind CSS 4, Prisma 6, Zod, bcrypt, Vitest, Playwright
- **Database:** PostgreSQL on Supabase (region eu-north-1), used both locally and by the live site.
- **Live site:** https://shopsphere-xi-ten.vercel.app (Vercel, region Stockholm). Currently protected by Vercel login; see "Deployment".
- **Payments:** Cash on Delivery only.
- Specs and design reference: `docs/`. Project rules: `CLAUDE.md`. Build log and decisions: `PROGRESS.md`.

## Quick start

Requirements: Node.js 20+ (built and tested on Node 24.21, npm 11.19, Windows 11).

```bash
npm install
```

```bash
cp .env.example .env
```

Then edit `.env` and put your own Supabase connection strings in `DATABASE_URL` and `DIRECT_URL` (see "Database" below). `.env` is never committed.

```bash
npm run db:setup
```

`db:setup` applies the migrations to the database in `.env` and loads the sample data (**the seed wipes the tables first**). Then:

```bash
npm run dev
```

Open http://localhost:3000. For a production build: `npm run build` then `npm start`.

> npm 11 may block package install scripts. If `@prisma/client` complains that it was not generated, run `npx prisma generate`.

## Demo logins (sample data, development only)

| Role | Email | Password | Starts at |
|---|---|---|---|
| Buyer | buyer@shopsphere.test | Buyer@12345 | `/` (cart already has 2 items, order #1042 is shipped) |
| Seller (approved shop "Ahmed Electronics") | seller@shopsphere.test | Seller@12345 | `/seller` |
| Seller (pending shop "Usman Traders") | newseller@shopsphere.test | Seller@12345 | `/seller` (shows "waiting for approval") |
| Admin | admin@shopsphere.test | Admin@12345 | `/admin` |
| Delivery partner | rider@shopsphere.test | Rider@12345 | `/delivery` |

Other sample customers (Sara, Bilal, Hina, Ali, shop owners) use the password `Demo@12345`.
Sample coupons: `EID20` (20% off Ahmed Electronics, min Rs. 2,000), `WELCOME500` (Rs. 500 off, min Rs. 3,000), `KURTA15` (Sana Fashion House).
The seed script refuses to run when `NODE_ENV=production`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server on :3000 |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run db:migrate` | Create/apply migrations (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run db:seed` | Reload sample data (**wipes** the dev database tables first) |
| `npm run db:reset` | Drop and recreate the dev database, then seed |
| `npm test` | Vitest. Unit tests always run; integration tests run only when `TEST_DATABASE_URL` is set (see Tests) |
| `npm run test:e2e` | Playwright end-to-end tests (see below) |
| `npm run smoke` | Requests all pages as every role and checks status codes/access (app must be running) |
| `npm run screenshots` | Saves a screenshot of all 38 pages to `screenshots/` (app must be running) |

### Tests

- `npm test`: 36 tests (21 unit, 15 integration). Pricing, coupons and delivery fees; role and ownership checks; order status transitions; checkout in a transaction with stock reservation, oversell and concurrency; delivery confirmation with the customer code; Khata balances, statements, edit/delete history and cross-shop isolation; CSV escaping; rate limiting; upload type sniffing.
- Integration tests wipe tables, so they refuse to run unless `TEST_DATABASE_URL` points at localhost or contains `schema=test` (a separate schema in the same Supabase database). Example: your `DIRECT_URL` + `?schema=test`. They are slow over a remote database (about 5 minutes).
- `npm run test:e2e`: 15 browser tests against the **seeded dev database**. Run `npm run db:seed` first; the tests change data such as orders, stock and Khata entries. They use your installed Google Chrome (`channel: "chrome"`). To use Playwright's own browser, run `npx playwright install chromium` and set `PW_CHANNEL=chromium`. Playwright starts `npm start` itself if nothing is running on :3000, so build first (`npm run build`).

## Where things are

```
prisma/schema.prisma        data model (30 tables), prisma/migrations, prisma/seed.ts
src/lib/                    server logic: auth/sessions, permissions, pricing, validation (Zod), rate limit, uploads, audit
src/lib/services/           catalog, cart, orders (checkout + status machine), delivery, khata, reports
src/app/actions/            server actions per area (auth, shop, seller, khata, admin, delivery)
src/app/(shop)/             public + buyer pages (header/footer layout), account/*
src/app/seller/  admin/  delivery/   dashboards (delivery is mobile-first)
tests/unit  tests/integration  tests/e2e
```

## Business rules (enforced on the server)

- Every action and route checks the session, role and ownership (`src/lib/auth.ts`, `src/lib/permissions.ts`). Hidden buttons are never the only protection.
- Prices, sale prices, coupons, delivery fees and totals are recalculated from the database (`src/lib/pricing.ts`). The browser never sends totals.
- Checkout runs in one transaction. Stock is reserved with a conditional `UPDATE … WHERE stock - reserved >= qty`, so there is no overselling. One order is created per shop.
- Order statuses: Pending → Confirmed → Packed → Shipped → Delivered, plus Cancelled and Returned. Each change is stored in `OrderStatusEvent` with a timestamp, and the allowed transitions depend on who acts.
- Stock moves: reserved at checkout, committed when shipped, released on cancel, restocked on return.
- Products are public only when the shop is approved, the product is active and it was not removed by moderation.
- Digital Khata is separate from marketplace payments. Balance = credit given − payments received. Edits and deletes keep a revision history (deletes are soft). Reminders need recorded customer consent.
- Admin actions are written to the audit log (with IP and user agent).
- Login, registration, coupon, checkout, password and report endpoints are rate-limited. Secrets live only in `.env`.
- Uploads accept JPG/PNG/WebP up to 2 MB, checked by file signature, and are saved under random names.

## Not configured / not built (clearly marked in the UI)

| Item | Status |
|---|---|
| Online payment gateway | **Not configured.** Shown as "coming soon". COD only. No card data is ever stored. |
| SMS / email / WhatsApp | **Not configured.** Notifications are in-app only. Khata reminders only prepare the text. Password reset (needs email) is not available. |
| Google sign-in | **Not configured** (button disabled) |
| Courier API, live map | **Not configured.** Delivery partners update statuses manually; the map shows a placeholder. |
| S3 / cloud image storage | **Not implemented.** Uploads are saved to `public/uploads` (`UPLOAD_DRIVER=local`). |
| Category images | Not built (categories have no image upload) |
| Seller payouts / commission settlement | Not built. Commission % is a setting for reporting only. |
| Multi-instance rate limiting | In-memory, single server process only |
| CI | `.github/workflows/ci.yml` is written but has **not been run** (no GitHub remote) |
| Deployment | Deployed to Vercel (see below). Image uploads do not work there (no cloud storage). |

## Database (Supabase PostgreSQL)

`.env` needs two URLs for the same Supabase project (copy them from Supabase: Connect, then Session pooler / Transaction pooler):

```
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

`DATABASE_URL` (transaction pooler) is used by the running app; `DIRECT_URL` (session pooler) is used by `prisma migrate`. Apply the schema with `npx prisma migrate deploy`, then `npm run db:seed` for demo data (development/demo only).
The direct `db.<ref>.supabase.co` host is IPv6-only, which many networks lack, so use the pooler hosts.
To use a local PostgreSQL instead, point both URLs at it. SQLite is no longer supported: the migrations are PostgreSQL-specific and text search relies on `mode: "insensitive"`.

## Deployment (Vercel)

Deployed with the Vercel CLI (project `shopsphere`, `vercel.json` pins region `arn1` next to the database):

1. Environment variables (Production, stored encrypted): `DATABASE_URL`, `DIRECT_URL`, `COOKIE_SECURE=true`.
2. `vercel deploy --prod`. The build runs `prisma generate` (postinstall), lint, type check and `next build`.
3. Migrations are not run by the build. Run `npx prisma migrate deploy` from a machine with `DIRECT_URL` set whenever the schema changes.
4. **Deployment Protection** is on by default, so visitors must log in to Vercel. Turn it off in Vercel (Project Settings, Deployment Protection) only after changing the demo passwords: the live database contains the demo accounts listed above.
5. Uploads (product, shop, review, return and delivery photos) save to the local disk, which is read-only on Vercel, so they show a clear error. Cloud storage (for example Supabase Storage) still needs to be added.

## Known limitations

- Route-level `loading.tsx` skeletons are intentionally **not used**. In testing with Next.js 15.5.28 they made client-side navigations and form submissions hang intermittently (link prefetch + loading boundary). Loading feedback is shown on buttons instead: spinner and "Saving…" text while a form submits.
- Server actions do not call `revalidatePath`; forms call `router.refresh()` after success. All pages are dynamic.
- Search filters on the effective (sale) price in memory after a database pre-filter. That is fine for the sample catalogue; use SQL or full-text search at scale.
- Product ratings and review counts in the seed are sample numbers.
