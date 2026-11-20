# Nexus Consumers Limited — Production E-commerce Platform

## Your role

You are a senior full-stack engineer and product designer. You are building a production-ready e-commerce and direct-sales (member/PV) platform for **Nexus Consumers Limited**, a sister concern of Nexus Group of Companies. Work **step by step, one phase at a time**, following the rules below.

---

## 0. Working rules (follow these on every phase)

1. **First action:** save this whole prompt as `docs/SPEC.md` in the repo. Then create a `CLAUDE.md` with the project summary, stack, commands, coding conventions, and a "Current phase" line. Keep `CLAUDE.md` updated at the end of every phase.
2. **Plan before you code.** At the start of each phase, write a short plan: the files you will create or change, the decisions you are making, and the open questions. Wait for my approval before implementing.
3. **One phase per session.** Do not start the next phase until I say "continue".
4. **Never invent business rules.** For commission percentages, rank requirements, PV values, fees, delivery charges, and legal text, **ask me**. If a value is needed to keep building, put it in admin-editable settings or seed data marked `TODO: confirm`. Never hard-code it.
5. **Definition of done for every phase:**
   - `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass
   - new logic has unit tests; money and commission logic must have test coverage
   - the app runs locally with `docker compose up` + `pnpm dev`
   - one git commit per phase with a clear message (Conventional Commits)
   - a phase report: what was built, how to test it manually, known gaps, next phase
6. **No secrets in code.** Everything goes through `.env`, validated at startup with `zod`. Keep `.env.example` up to date.
7. **Mobile-first.** Most users are on low- to mid-range Android phones with slow mobile data. Performance and small bundle size matter.
8. Prefer boring, well-maintained libraries. Explain any new dependency in one line.

---

## 1. Business context

- **Company:** Nexus Consumers Limited (Nexus Group of Companies / Nexus Global PLC)
- **Domain:** `nexusglobalplc.com`
- **Corporate office:** 103, New Town, Kishoreganj Sadar, Kishoreganj, Bangladesh
- **Market:** Bangladesh. Currency BDT (৳). Timezone `Asia/Dhaka`.
- **Languages:** Bangla (default) and English, switchable by the user. All UI text goes through i18n. No hard-coded strings.
- **Products:** consumer goods such as daily essentials, toiletries, groceries, cosmetics, household care, beverages, and fashion/shoes.
- **Customer types:**
  - **Guest / Customer:** buys at MRP
  - **Member / Partner:** registered with KYC, buys at member price, earns PV, has a referral network, earns commissions
  - **Dealer / Agent:** regional stock point; manages local stock, fulfils orders, earns dealer commission
  - **Admin staff:** roles listed in section 6
- **Brand colours (from the group presentation):** navy `#13204A`, gold `#E8892B`, white. Clean, corporate, trustworthy look. Ask me for the logo files.

---

## 2. Tech stack (fixed unless I approve a change)

| Layer | Choice |
|---|---|
| App | **Next.js 15 (App Router) + TypeScript (strict)** — one full-stack app |
| UI | Tailwind CSS + shadcn/ui, lucide-react icons, react-hook-form + zod |
| i18n | next-intl (`bn`, `en`) |
| Database | **PostgreSQL 16** + **Prisma ORM** (relational integrity and transactions are required for orders, wallets and the network tree) |
| Cache / queues | Redis + BullMQ (background jobs: commission runs, SMS, emails, invoice PDFs) |
| Auth | Auth.js (NextAuth v5) using a credentials + **mobile OTP** flow; RBAC middleware |
| File storage | S3-compatible storage (Cloudflare R2 or MinIO locally). KYC files go in a **private** bucket served only through signed URLs |
| Search | PostgreSQL full-text search (pg_trgm) first; leave an interface so Meilisearch can be added later |
| Payments | Cash on Delivery, **SSLCommerz**, **bKash Tokenized Checkout**, **Nagad** — each behind one `PaymentProvider` interface |
| SMS | Bangladeshi SMS gateway behind an `SmsProvider` interface (I will confirm which provider) |
| Testing | Vitest (unit/integration), Playwright (e2e), Testcontainers or a test DB for integration tests |
| Observability | pino logging, Sentry, a `/api/health` endpoint |
| Deploy | Docker multi-stage build, docker-compose (app, worker, postgres, redis, nginx), GitHub Actions CI |
| Package manager | pnpm |

### Money and data rules (critical)

- Store all money as **integer paisa** (`BigInt`/`Int`). Never use floats. Use one formatting helper for ৳.
- Store PV as an integer or a fixed-precision decimal, never a float.
- Order items **snapshot** the price, member price and PV at the time of purchase.
- Wallets use a **double-entry ledger** (`LedgerEntry` rows). A balance is always derived from the ledger or kept in sync inside the same transaction. Never update a balance without a ledger entry.
- Every financial operation runs in a DB transaction and is **idempotent**, using idempotency keys on payment callbacks, commission runs and withdrawals.
- NID numbers are encrypted at the application level and masked in the UI (`**** **** 1234`).
- Soft-delete for products, users and orders. Keep an audit log for every admin action.

---

## 3. Feature scope

### 3.1 Storefront (B2C + member)
- Homepage: hero banner slider (admin-managed), categories, featured products, flash deals with countdown, new arrivals, best sellers, trust badges (COD, genuine products, fast delivery).
- Product listing: category / brand / price filters, sorting, pagination or infinite scroll, search with suggestions.
- Product page: image gallery, variants (size/colour/weight), stock status, and **MRP, member price and PV** clearly shown. Guests see "Login as member to get ৳X off + Y PV". Also: description, specifications, reviews and ratings, related products.
- Cart (guest cart merged on login), wishlist, coupons and flash-deal pricing.
- Checkout: address book with Bangladesh **Division → District → Upazila/Thana** selectors, delivery charge rules (inside/outside Dhaka, configurable), and a payment method choice: COD, bKash, Nagad, or card/bank via SSLCommerz.
- Order tracking page and SMS updates at each status change.
- Static/CMS pages: About, Contact, Privacy Policy, Terms, Return & Refund Policy, FAQ.
- SEO: metadata, Open Graph, sitemap.xml, robots.txt, structured data (Product, Organization, Breadcrumb).
- Footer: corporate office address, customer support phone/email (ask me), quick links, social links, payment method logos.

### 3.2 Registration, login and KYC
- Sign up with full name, mobile number (OTP verified), password, and optional **Referral (Sponsor) ID**. If a Referral ID is given, show the sponsor's name for confirmation before submitting.
- Become a member: KYC form with NID number, date of birth, NID front/back images, a selfie, and nominee details. Status flow: `PENDING → APPROVED / REJECTED (with reason)`.
- Login with mobile + password, or mobile + OTP. Forgot password via OTP.
- Rate-limit OTP and login attempts.

### 3.3 Member dashboard
- Overview: personal PV, team PV (left/right if binary), current rank, rank progress bar, wallet balance, and recent orders.
- My orders, invoices (PDF download), and reorder.
- **My network:** referral link and QR code, direct referrals list, and a tree view with lazy loading (handle large trees without loading everything).
- **Wallet:** balance, ledger history filtered by bonus type (Matching, Reference/Referral, Retail, Royalty, and others from settings), and a withdrawal request to bKash, Nagad or bank, with minimum amount and charges from settings.
- Rank progress from **PSM → … → Nexus Ambassador**. The rank list and criteria come from the admin-editable `Rank` table. Ask me for the full rank ladder.
- Profile, addresses, KYC status, password change, and notifications.

### 3.4 Dealer / Agent portal
- Dealer application with business info, trade licence, and NID, approved by admin.
- Dealer stock: stock received from the company, stock levels, low-stock alerts, and stock requisition to the company.
- Orders assigned to the dealer by area: accept, pack, hand over, mark delivered, and print the invoice.
- Dealer commission summary and ledger.
- Point-of-sale screen so a dealer can place an order for a walk-in member using their member ID (the member earns the PV).

### 3.5 Admin panel (`/admin`)
- Dashboard: sales today/week/month, orders by status, new members, pending KYC, pending withdrawals, low stock, and charts.
- Catalogue: categories, brands, products, variants, images, MRP / member price / PV per variant, SEO fields, and CSV bulk import/export.
- Inventory: central warehouse and dealer stock, stock movements with reasons, and stock transfer to dealers.
- Orders: state machine `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, plus `CANCELLED`, `RETURN_REQUESTED`, `RETURNED` and `REFUNDED`. Assign orders to a dealer or courier, print invoice and packing slip, and log every change.
- Payments: transaction list, gateway reconciliation, and manual refund recording.
- Users and KYC: search, view, approve/reject KYC with a reason, block/unblock, and change sponsor/placement only by super-admin with a reason and an audit log.
- Commission engine: rules and settings screen, dry-run preview, run/approve/lock a commission period, and per-member breakdown.
- Withdrawals: approve/reject, mark paid with a transaction reference, and export.
- Marketing: coupons, flash deals, banners, and push/SMS campaigns.
- CMS pages, site settings (delivery charges, withdrawal rules, support contacts), and email/SMS templates.
- Reports with CSV/Excel export: sales, products, PV, commissions, withdrawals, dealers, and tax/VAT.
- Audit log viewer.

### 3.6 Commission & PV engine (most critical — build it carefully)
- A **configuration-driven** engine. Bonus types (Matching/Binary, Reference/Direct, Retail, Royalty, Rank bonus and others) are plugins that implement one `BonusCalculator` interface.
- **Do not guess any rule.** Before Phase 7, ask me for the full compensation plan: PV rules, binary pairing/matching ratio, capping, carry-forward/flush-out, referral levels and percentages, royalty pool rules, rank criteria, payout cycle (daily/weekly/monthly), and TDS/service-charge deductions.
- PV is credited when an order is **DELIVERED**, not when it is placed. It is reversed on return/refund.
- Commission runs per period as a background job. Each run is **dry-run → admin review → approve → posted to the ledger → locked**. Re-running a locked period is impossible.
- Every credited amount must be explainable: store calculation details (source order, source member, rule, rate) so the admin and the member can see why they received it.
- Ship a full unit-test suite with fixture trees (small tree, unbalanced tree, capping case, refund reversal case).

---

## 4. Non-functional requirements

- **Security:** OWASP Top 10, zod validation on every input, RBAC checked on the server (not only hidden in the UI), CSRF protection, secure cookies, rate limiting, signed and verified payment callbacks (validate against the gateway's API, not only the redirect), private KYC files, and dependency audit in CI.
- **Performance:** Lighthouse mobile ≥ 90 on the homepage and product pages, optimised images (`next/image`, WebP/AVIF), ISR/caching for the catalogue, DB indexes on every foreign key and filter column.
- **Accessibility:** WCAG 2.1 AA, keyboard navigable, proper labels, and good colour contrast.
- **Reliability:** daily automated Postgres backups, a health check, graceful job retries, and a dead-letter queue for failed jobs.
- **Compliance:** support for Bangladesh's Digital Commerce Operation Guidelines (clear delivery timelines, refund policy, payment handling) and data privacy. Compliance with the law governing direct selling / multilevel marketing in Bangladesh is the company's responsibility. Keep all policy text admin-editable, and flag anything you think needs legal review.

---

## 5. Data model (starting point — refine in Phase 2)

`User`, `Role`, `OtpCode`, `Session`, `MemberProfile` (memberId, sponsorId, placementParentId, placementSide, rankId, joinedAt), `KycSubmission`, `Nominee`, `Address`, `Division` / `District` / `Upazila`, `Category`, `Brand`, `Product`, `ProductVariant` (sku, mrp, memberPrice, pv, weight), `ProductImage`, `Review`, `Warehouse`, `Dealer`, `StockItem`, `StockMovement`, `Cart`, `CartItem`, `Wishlist`, `Coupon`, `FlashDeal`, `Order`, `OrderItem` (price/PV snapshot), `OrderStatusHistory`, `Payment`, `PaymentEvent` (raw webhook log), `Shipment`, `ReturnRequest`, `Refund`, `PvLedger`, `WalletAccount`, `LedgerEntry`, `CommissionRun`, `CommissionItem`, `Rank`, `RankHistory`, `WithdrawalRequest`, `Notification`, `Banner`, `CmsPage`, `Setting`, `AuditLog`.

---

## 6. Roles and permissions

`SUPER_ADMIN`, `ADMIN`, `FINANCE` (withdrawals, commission approval), `INVENTORY_MANAGER`, `ORDER_MANAGER`, `KYC_OFFICER`, `SUPPORT`, `DEALER`, `MEMBER`, `CUSTOMER`. Use a permission matrix in code, not role-name checks scattered around the codebase.

---

## 7. Project structure (target)

```
/
├─ CLAUDE.md
├─ docs/ (SPEC.md, DECISIONS.md, RUNBOOK.md, API.md)
├─ prisma/ (schema.prisma, migrations/, seed.ts)
├─ src/
│  ├─ app/
│  │  ├─ [locale]/(store)/…        # public storefront
│  │  ├─ [locale]/(account)/…      # member dashboard
│  │  ├─ [locale]/dealer/…         # dealer portal
│  │  ├─ [locale]/admin/…          # admin panel
│  │  └─ api/ (webhooks/, health/)
│  ├─ components/ (ui/, store/, admin/, shared/)
│  ├─ server/
│  │  ├─ modules/ (auth, catalog, cart, order, payment, inventory, member, network, wallet, commission, dealer, kyc, cms, notification)
│  │  ├─ providers/ (payment/, sms/, storage/)
│  │  └─ jobs/ (BullMQ workers)
│  ├─ lib/ (money.ts, env.ts, rbac.ts, i18n/, validators/)
│  └─ messages/ (bn.json, en.json)
├─ tests/ (unit/, integration/, e2e/)
├─ docker/ (Dockerfile, nginx.conf)
├─ docker-compose.yml
└─ .github/workflows/ci.yml
```

Business logic lives in `src/server/modules/*` services, not in React components or route handlers.

---

## 8. Phases (build in this exact order)

**Phase 0 — Discovery & plan**
Read this spec. List every question you need answered (compensation plan, rank ladder, payment merchant accounts, SMS provider, delivery charges, support contacts, logo/brand assets, hosting). Write `docs/PLAN.md` with milestones and risks. **Stop and wait for my answers.**

**Phase 1 — Project setup**
Scaffold Next.js + TypeScript + Tailwind + shadcn/ui + next-intl, ESLint/Prettier, Vitest, Playwright, env validation, docker-compose (Postgres, Redis, MinIO, Mailpit), GitHub Actions CI, base layout with a bn/en switcher, and the health endpoint.

**Phase 2 — Database schema & seed**
Full Prisma schema, migrations, indexes, and a seed script with demo categories, 30 demo products, BD locations (Division/District/Upazila), ranks marked `TODO: confirm`, admin users, a demo member tree, and a demo dealer. Add an ER diagram in `docs/`.

**Phase 3 — Auth, roles & KYC**
OTP registration/login (use a console SMS provider in dev), sponsor lookup, RBAC middleware, permission matrix, KYC submission with private file upload, and the admin KYC review screen. Tests included.

**Phase 4 — Storefront**
Homepage, listing, search, product page with MRP / member price / PV, CMS pages, SEO, and a responsive header/footer with the corporate address. Lighthouse check.

**Phase 5 — Cart, checkout & payments**
Cart/wishlist, coupons, flash deals, address selector, delivery charges, COD, and SSLCommerz + bKash + Nagad in **sandbox mode** with verified, idempotent callbacks. Order state machine, invoice PDF, SMS/email notifications, and an order tracking page. E2E test of the full purchase flow.

**Phase 6 — Member dashboard**
Overview, orders, PV history, network tree (lazy loaded), referral link/QR, wallet ledger view, withdrawal request, profile and addresses.

**Phase 7 — Commission & PV engine**
Only after I provide the compensation plan. Bonus calculator plugins, period runs (dry-run → approve → post → lock), PV credit on delivery and reversal on refund, explainable commission items, and a full fixture-based test suite.

**Phase 8 — Dealer portal**
Dealer application, stock, requisitions, assigned orders, POS for walk-in members, and dealer commission.

**Phase 9 — Admin panel**
Dashboard, catalogue (with CSV import), inventory, orders, payments, users, commission runs, withdrawals, marketing, CMS, settings, reports with export, and the audit log viewer.

**Phase 10 — Hardening**
Security review against OWASP, rate limits, a backup script, Sentry, a performance pass, an accessibility pass, a test coverage report (target ≥ 80% on `server/modules`; 100% of commission and wallet logic), and seed cleanup.

**Phase 11 — Deployment**
Production Dockerfile, Nginx with SSL (Let's Encrypt) for `nexusglobalplc.com`, a docker-compose production profile, a CI/CD deploy workflow, a migration strategy, and `docs/RUNBOOK.md` (deploy, rollback, backup/restore, rotating secrets, going live with payment gateways).

---

## 9. Start now

Begin with **Phase 0** only: save this spec to `docs/SPEC.md`, create `CLAUDE.md`, write `docs/PLAN.md`, and give me your list of questions. Do not write application code yet.
