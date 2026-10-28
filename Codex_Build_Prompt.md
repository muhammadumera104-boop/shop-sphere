# Build prompt: ShopSphere (Multi-Vendor Marketplace + Digital Khata)

Copy everything below into Codex (or any coding agent). Attach `Marketplace_Khata_Funding_Proposal.pdf` as the visual and requirements reference.

---

## Role
You are a senior full-stack engineer. Build the complete, working website described below, with a real backend and database. Work in small, testable phases. Before writing code, inspect the current folder and report what already exists; do not overwrite working code.

## Product
**ShopSphere** is a responsive multi-vendor marketplace (Daraz-style) with a built-in Digital Khata ledger (Easy Khata-style) for shopkeepers. One account can act as Buyer and, after switching to Seller Mode, as a shop owner. Roles: Guest, Buyer, Seller, Delivery Partner, Admin.

Reference the attached PDF for the visual style: clean, premium, indigo/violet accents with a gold highlight, generous whitespace, consistent product cards, sticky header with search, wishlist, cart and a Buyer/Seller switch, mobile-friendly layouts.

## Tech stack
- Next.js (App Router) + TypeScript, Tailwind CSS
- PostgreSQL + Prisma (migrations and a development seed script)
- Auth: secure sessions (Auth.js or equivalent), password hashing with argon2 or bcrypt
- Image uploads: local storage in development, S3-compatible storage in production, with type and size limits
- Validation: Zod on every API input
- Tests: Vitest/Jest for business rules, Playwright for the main flows

## Database (minimum tables)
users, shops, categories, products, product_variants (stock_quantity, reserved_quantity), carts, cart_items, wishlists, addresses, orders, order_items (price snapshot), payments, refunds, shipments (tracking events), coupons, reviews, support_tickets, notifications, khata_parties (customer/supplier), ledger_entries (credit / payment, amount, date, note, edit history), expenses, audit_logs.

## Pages
- **Public:** Home, Category, Search results, Product details, Shop storefront, Login/Register, Cart, Checkout
- **Buyer:** Profile, Addresses, Orders, Order tracking, Wishlist, Reviews, Returns/refunds, Notifications
- **Seller:** Dashboard, Products, Add/Edit product, Inventory, Orders, Promotions, Khata customers, Khata ledger, Expenses, Reports, Shop settings
- **Admin:** Dashboard, Seller approvals, Listing moderation, Categories, Orders/disputes, Promotion rules, Audit log, Platform settings
- **Delivery:** Assigned shipments, Update status, Delivery confirmation

## Business rules (must be enforced on the server)
1. Check role and ownership on every protected endpoint. Never rely on the frontend.
2. Calculate prices, sale prices, coupons, delivery fees and totals on the server. Never trust totals from the browser.
3. Checkout runs in a database transaction: check stock, reserve it, create order and order items, no overselling.
4. Order statuses: Pending, Confirmed, Packed, Shipped, Delivered, Cancelled, Returned. Record every change with a timestamp.
5. Payments: Cash on Delivery first. Online gateway only through a hosted/tokenized provider in sandbox mode. Never store raw card details.
6. Digital Khata is separate from marketplace payments. Balance = credit given minus payments received. Every edit to a ledger entry is kept in an audit history. Payment reminders only with user consent.
7. A seller must be approved by an admin before products are public.
8. Admin actions are written to audit_logs.
9. Rate-limit login and sensitive endpoints; keep secrets in environment variables.

## Build phases
1. Foundation: repo structure, Prisma schema + migrations, seed data (development only), auth, roles, shared UI components
2. Catalogue and Seller Mode: shop setup, product CRUD, images, variants, stock, search and filters
3. Buyer shopping: cart, wishlist, checkout, order creation, order history, tracking
4. Promotions and delivery: sale prices, coupons, shipments, delivery partner updates, notifications
5. Digital Khata: parties, ledger, payments, expenses, balances, date-filtered reports, CSV export
6. Admin panel: approvals, moderation, categories, disputes, audit log, analytics
7. Quality: loading/empty/error states, accessibility (keyboard, focus, contrast), responsive checks, tests
8. Documentation and deployment

## Acceptance criteria
- A buyer can register, search, filter, add to cart, place an order and see its status.
- A user can switch to Seller Mode, create a shop, publish a product (after approval), update stock and process orders.
- A shopkeeper can add credit, record a payment and see the correct balance and statement.
- An admin can approve sellers, moderate listings and review the audit log.
- Users only see data permitted for their role.
- The UI works on desktop, tablet and mobile.
- Automated tests cover checkout totals, stock reservation, role checks and Khata balances.

## Deliverables
- Working application with database migrations and a seed script
- `README.md` with setup commands, `.env.example`, migration/seed/test commands and deployment steps
- Final summary: what is done, what remains, which external services or credentials are needed, and which tests were run

## Honesty rule
Do not claim payments, SMS/email, delivery tracking or deployment work unless they are configured and tested. Mark unfinished integrations clearly as unavailable. Use sample data in development only.
