# ShopSphere build progress

Resume rule: read this file and `CLAUDE.md` first, then continue from the first unticked item.

## Phases
- [x] 1 Foundation (setup, Prisma schema + migrations, seed data, auth, roles, shared UI components)
- [x] 2 Catalogue and Seller Mode
- [x] 3 Buyer shopping (cart, wishlist, checkout, orders, tracking)
- [x] 4 Promotions and delivery
- [x] 5 Digital Khata
- [x] 6 Admin panel
- [x] 7 Quality (empty/error/pending states, accessibility basics, responsive checks, tests)
- [x] 8 Documentation (README, .env.example, CI file). Deployment itself: **not performed** (see README)

## Pages (38): all built, all load for their role (smoke test 77/77)
### Public (8)
- [x] Home `/`
- [x] Category `/category/[slug]`
- [x] Search results `/search`
- [x] Product details `/product/[slug]`
- [x] Shop storefront `/shop/[slug]`
- [x] Login / Register `/login`
- [x] Cart `/cart`
- [x] Checkout `/checkout`

### Buyer (8)
- [x] Profile `/account/profile`
- [x] Addresses `/account/addresses`
- [x] Orders `/account/orders`
- [x] Order tracking `/account/orders/[number]`
- [x] Wishlist `/account/wishlist`
- [x] Reviews `/account/reviews`
- [x] Returns / refunds `/account/returns`
- [x] Notifications `/account/notifications`

### Seller (11)
- [x] Dashboard `/seller`
- [x] Products `/seller/products`
- [x] Add / edit product `/seller/products/new`, `/seller/products/[id]`
- [x] Inventory `/seller/inventory`
- [x] Orders `/seller/orders` (includes the Returns tab)
- [x] Promotions `/seller/promotions`
- [x] Khata customers `/seller/khata/customers` (Customers / Suppliers tabs)
- [x] Khata ledger `/seller/khata/ledger/[id]` (+ CSV statement)
- [x] Expenses `/seller/khata/expenses`
- [x] Reports `/seller/reports` (+ CSV export)
- [x] Shop settings `/seller/settings`

Extra: `/open-shop` (Seller Mode onboarding), `/help`, `/forbidden`, 404 page.

### Admin (8)
- [x] Dashboard `/admin`
- [x] Seller approvals `/admin/sellers`
- [x] Listing moderation `/admin/listings`
- [x] Categories `/admin/categories`
- [x] Orders / disputes `/admin/disputes` (All orders, Disputes, Refunds, Delivery exceptions)
- [x] Promotion rules `/admin/promotions`
- [x] Audit log `/admin/audit` (+ CSV export)
- [x] Platform settings `/admin/settings`

### Delivery (3, mobile-first)
- [x] Assigned shipments `/delivery`
- [x] Update status `/delivery/[number]`
- [x] Delivery confirmation `/delivery/[number]/confirm`

## Test results (last run, 28 Oct 2026)
- `npm test`: 4 files, **36/36 passed**
- `npm run test:e2e`: **14 passed, 1 skipped** (the mobile-only menu test on the desktop project), stable over 3 consecutive runs
- `npm run smoke`: **77/77** page/role/access checks passed
- `npm run build` (incl. ESLint + type check): passes
- Screenshots of all 38 pages reviewed: home, product, seller dashboard, Khata ledger, admin dashboard and delivery list were compared to the design reference

## Decisions
- **Single full-stack Next.js app at the project root.** The pre-existing `back end/` and `front end/` folders were empty and are left untouched. Backend = server actions + route handlers + `src/lib/services`.
- **SQLite for local dev**: no PostgreSQL or Docker was found on this machine. The schema uses strings instead of enums and Int money so it can switch to PostgreSQL (README documents how). PostgreSQL itself is untested.
- **Auth**: own DB sessions (random token, SHA-256 hash stored, httpOnly SameSite=Lax cookie, 30 days) + bcrypt, instead of Auth.js, to keep role checks simple and testable. Google login is shown as "Not configured".
- **Roles**: `User.role` = BUYER | ADMIN | DELIVERY. A user is a Seller when they own a `Shop`; Seller Mode is available to any BUYER account through `/open-shop`.
- **Cart needs login** (stored per user on the server so prices and stock are always re-checked). Guests see a "Log in to see your cart" state.
- **Multi-vendor orders**: one checkout creates one order per shop (shared `checkoutGroup`), so each seller processes only their own order. Delivery fee is charged per shop package; standard delivery is free when a shop's subtotal after discount is ≥ Rs. 5,000 (admin setting).
- **Coupons** belong to a shop and discount only that shop's items; one coupon per checkout. The admin "max discount %" caps seller coupons at creation.
- **Stock**: `available = stockQuantity - reservedQuantity`. Checkout reserves; "Hand to courier" (Shipped) commits; cancel releases; return refund restocks.
- **Delivery**: shipped orders are auto-assigned to the active delivery partner with the fewest open shipments. Delivery is confirmed with a 4-digit code shown to the buyer, and COD cash must be ticked as collected. Admin can reassign failed shipments.
- **Disputes**: "Refund buyer" records a refund (delivered orders → Returned and restocked; open orders → Cancelled; shipped → pending refund). Money is not moved (no gateway).
- **Money** is whole rupees (Int).
- **Product images**: gradient tiles by default (per design reference). Optional uploads go to `public/uploads` (dev), JPG/PNG/WebP, max 2 MB, checked by magic bytes.
- **Charts** are hand-written SVG components (no chart library).
- **Login rate limit** counts failed attempts (5 per 10 min per IP+email) and resets on success.
- **No route-level `loading.tsx`**: with Next.js 15.5.28 in production, a loading boundary + link prefetch made client navigations and form actions hang intermittently (reproduced in two browsers; fixed by removing them). Pending feedback is on buttons instead. Pages that use `redirect()`/`notFound()` also keep correct 307/404 status codes this way.
- **Server actions don't call `revalidatePath`**; the shared form components call `router.refresh()` after success (all pages are dynamic).
- Test DB setup uses `prisma db push` without `--force-reset` (Prisma blocks resets when run by an AI agent); tests clear rows themselves.

## Log
- Read the three specs (PDF text extracted with pypdf into `docs/proposal-text.txt`), copied them into `docs/`.
- Network to the npm registry was very slow/flaky: two installs failed, and one left corrupted packages, fixed with a clean `npm ci`. Windows Defender-style transient "module not found" errors appeared during one build and went away on retry.
- Built all phases in one pass, then verified everything together (typecheck, lint, build, 36 unit/integration tests, 77 smoke checks, 15 e2e, screenshots).
- Fixed during verification: wrong onboarding redirect (`/seller/onboarding` → `/open-shop`), streaming status codes, the Next.js loading-boundary hang, admin chart using UTC days.
- **Git history note:** phases were not committed one by one as asked, because the build happened in a single pass and was only verified as a whole. Committed as one verified feature commit (phases 1–7) plus a docs commit.
