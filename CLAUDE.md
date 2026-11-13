# ShopSphere: project rules

Multi-vendor marketplace (Daraz-style) + Digital Khata ledger (Easy Khata-style).
Specs live in `docs/` (`Codex_Build_Prompt.md` is the main spec, `ShopSphere_Gemini_Image_Prompts.md` is the visual reference for all 38 pages). Progress is tracked in `PROGRESS.md`.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 (theme tokens in `src/app/globals.css`)
- Prisma 6. PostgreSQL on Supabase (`DATABASE_URL` pooled runtime URL, `DIRECT_URL` for migrations). Deployed on Vercel. See README.
- Auth: own session table + httpOnly cookie, bcrypt password hashing (`src/lib/auth.ts`)
- Zod on every server action / API input (`src/lib/validation.ts`)
- Vitest (`tests/unit`, `tests/integration`) and Playwright (`tests/e2e`)

## Colour palette
| Token | Hex | Use |
|---|---|---|
| indigo | #4F46E5 | primary buttons, active nav, prices |
| violet | #7C3AED | secondary, gradients, "Shipped" |
| gold | #F5B83D | highlight, ratings, "Pending", seller-mode label |
| emerald | #10B981 | success, Khata accent, "Delivered" |
| rose | #F43F5E | alerts, discounts, dues, admin label |
| sky | #0EA5E9 | info, "Packed" |
| navy | #0B1020 | sidebars, dark panels, footer |
| page bg | #F6F7FB | body background |
| ink / muted | #111827 / #6B7280 | headings / body text |

Cards: white, 12px radius, #E5E7EB border, soft shadow. Buttons: pill shaped. Currency: `Rs. 3,499` (use `formatRs`).

## Non-negotiable rules
1. **All prices, discounts, coupons, delivery fees and totals are calculated on the server** (`src/lib/pricing.ts`). Never accept totals from the browser.
2. **All permissions are checked on the server**: every server action/route calls `requireUser`, `requireRole`, `requireShop` or an ownership check from `src/lib/auth.ts` / `src/lib/permissions.ts`.
3. Checkout runs in one DB transaction and reserves stock with a conditional update (no overselling).
4. Every order status change writes an `OrderStatusEvent` with a timestamp.
5. Khata is separate from marketplace payments. Balance = credit given - payments received. Every ledger edit writes a `LedgerEntryRevision`.
6. Products are public only when the shop is APPROVED, the product is ACTIVE and not removed by moderation.
7. Admin actions write to `AuditLog`.
8. Payments: Cash on Delivery only. Online payment, SMS/email and courier APIs are "Not configured" placeholders. Never store card data.
9. Money is stored as whole rupees (`Int`).
10. Seed data is for development only (`prisma/seed.ts` refuses to run when `NODE_ENV=production`).

## Commands
`npm run dev` · `npm run build` · `npm test` · `npm run test:e2e` · `npm run db:migrate` · `npm run db:seed` · `npm run db:reset`
