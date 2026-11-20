# Nexus Consumers Limited — Delivery Plan, Milestones & Risk Register

**Status:** Phase 0 — Discovery & Plan (awaiting stakeholder answers)  
**Spec Reference:** `docs/SPEC.md`  
**Target Domain:** `nexusglobalplc.com`  

---

## 1. Architecture Summary

The platform unifies four operational surfaces on top of a single strongly typed modular service layer and relational PostgreSQL database:

1. **Public Storefront (`/[locale]/(store)`)** — Bangla-first (`bn` / `en`) mobile-optimized B2C & member storefront displaying MRP, Member Price, and PV per variant, with Bangladesh Division → District → Upazila checkout and COD / SSLCommerz / bKash / Nagad payments.
2. **Member Dashboard (`/[locale]/(account)`)** — KYC onboarding, order & PDF invoice history, personal & team PV tracking, lazy-loaded referral/placement network tree, double-entry wallet ledger, rank progress, and withdrawal requests.
3. **Dealer / Agent Portal (`/[locale]/dealer`)** — Regional stock point operations: dealer onboarding, stock levels & requisitions, area-assigned order fulfilment, walk-in member POS (crediting member PV), and dealer commission ledger.
4. **Admin Control Panel (`/[locale]/admin`)** — Role-based operations across catalogue, central/dealer inventory, order state machine, payment reconciliation, KYC approval, configuration-driven commission runs (`dry-run → review → approve → post → lock`), withdrawals, marketing, CMS, reports, and immutable audit logs.

All business logic resides in `src/server/modules/*`, with external services abstracted behind pluggable provider interfaces (`PaymentProvider`, `SmsProvider`, `StorageProvider`, `SearchProvider`, `BonusCalculator`).

---

## 2. Phase Milestones, Estimated Timelines & Exit Criteria

> **Estimated Total Duration:** **10–13 weeks** (~52–65 engineering days across Phases 0–11, assuming one senior full-stack engineer and timely stakeholder sign-off on compensation rules, brand assets, and payment/SMS merchant sandboxes).

| Phase | Milestone | Est. Timeline | Core Deliverables | Exit Criteria |
|---|---|---|---|---|
| **Phase 0** | **Discovery & Plan** | **1–2 days** *(Week 1)* | `docs/SPEC.md`, `CLAUDE.md`, `docs/PLAN.md`, complete discovery question list | All blocking business, compliance, brand, and environment questions answered & approved |
| **Phase 1** | **Project Setup** | **2–3 days** *(Week 1)* | Full-stack scaffold, TypeScript strict config, Tailwind + shadcn/ui, `bn`/`en` i18n switcher, ESLint/Prettier, Vitest + Playwright, `zod` env validation, `docker-compose.yml` (Postgres, Redis, MinIO, Mailpit), GitHub Actions CI, `/api/health` | Lint, typecheck, test suite, and health endpoint green; base responsive shell renders in `bn` and `en` |
| **Phase 2** | **Database Schema & Seed** | **3–4 days** *(Week 2)* | Full Prisma schema (40+ entities), migrations, FK/filter indexes, BD geo dataset (8 Divisions, 64 Districts, 495+ Upazilas), 30 demo products across consumer categories, `TODO: confirm` ranks/settings, demo member tree & dealer, ER diagram in `docs/` | Clean migration from scratch, idempotent seed script, relational constraints verified via integration tests |
| **Phase 3** | **Auth, Roles & KYC** | **4–5 days** *(Week 3)* | Mobile + password & mobile OTP auth (dev console SMS provider), sponsor ID lookup & confirmation, rate limiting, centralized RBAC permission matrix (10 roles), encrypted NID storage + UI masking, private-bucket KYC uploads (signed URLs), Admin KYC review queue | Unit + integration tests for OTP rate limits, RBAC enforcement across roles, NID encryption/masking, and KYC transitions |
| **Phase 4** | **Storefront** | **5–6 days** *(Week 4)* | Admin-managed hero slider, categories, flash deals countdown, product listing (filters/sort/pagination/`pg_trgm` search), PDP (gallery, variants, MRP/member price/PV, reviews), CMS pages, SEO (`sitemap.xml`, `robots.txt`, JSON-LD), responsive header/footer with corporate office & support contacts | Mobile-first audit, Lighthouse mobile ≥ 90 target on homepage & PDP, zero hard-coded strings |
| **Phase 5** | **Cart, Checkout & Payments** | **6–8 days** *(Weeks 5–6)* | Guest cart merge on login, wishlist, coupons, flash-deal pricing, BD Division→District→Upazila address book, configurable delivery charges, COD + SSLCommerz + bKash + Nagad (sandbox) with server-verified idempotent webhooks, order state machine, invoice PDF, SMS/email triggers, order tracking | End-to-end Playwright purchase flow test, idempotency & callback signature verification unit/integration tests |
| **Phase 6** | **Member Dashboard** | **5–6 days** *(Week 7)* | Overview KPIs, orders/invoices/reorder, PV ledger history, lazy-loaded network tree (pagination/subtree fetch), referral link & QR code, double-entry wallet ledger with bonus-type filters, withdrawal request flow (min amount & fees from settings), rank progress bar, profile/KYC/addresses | 100% test coverage on wallet ledger balance & withdrawal reservation invariants; smooth tree performance on mobile |
| **Phase 7** | **Commission & PV Engine** | **6–8 days** *(Weeks 8–9)* | *(Blocked until compensation plan is confirmed)* Pluggable `BonusCalculator` registry, PV credit on `DELIVERED` & automatic reversal on return/refund, period job (`dry-run → review → approve → post → lock`), explainable `CommissionItem` provenance, locked-period immutability | 100% unit/integration coverage across fixture trees (small, unbalanced, capping, carry-forward/flush-out, refund reversal, duplicate-run rejection) |
| **Phase 8** | **Dealer Portal** | **4–5 days** *(Week 9–10)* | Dealer application & admin approval, stock inventory & low-stock alerts, stock requisition workflow, area-assigned order fulfilment (pack/handover/deliver/print invoice), walk-in member POS (member ID lookup + PV credit), dealer commission ledger | End-to-end dealer fulfilment & POS PV-crediting tests; stock movement audit accuracy verified |
| **Phase 9** | **Admin Panel** | **7–9 days** *(Weeks 10–11)* | Executive KPI dashboard, catalogue CRUD + CSV import/export, central & dealer inventory transfers, order management & assignment, payment reconciliation & manual refunds, user/KYC/super-admin sponsor reassignment (with mandatory reason & audit), commission run console, withdrawal payouts, marketing, CMS, settings, CSV/Excel reports, audit log viewer | Server-side RBAC verified for every admin role (`SUPER_ADMIN`, `ADMIN`, `FINANCE`, `INVENTORY_MANAGER`, `ORDER_MANAGER`, `KYC_OFFICER`, `SUPPORT`) |
| **Phase 10** | **Hardening** | **4–5 days** *(Week 12)* | OWASP Top 10 audit, rate-limit tuning, automated Postgres backup script, Sentry integration, bundle & query performance pass, WCAG 2.1 AA accessibility pass, coverage verification (≥ 80% `server/modules`, 100% commission & wallet), production seed cleanup | All audits signed off, test coverage thresholds met, zero high/critical dependency vulnerabilities |
| **Phase 11** | **Deployment** | **3–4 days** *(Week 13)* | Multi-stage production Dockerfile, Nginx reverse proxy with Let's Encrypt SSL for `nexusglobalplc.com`, production `docker-compose`, CI/CD deploy pipeline, zero-downtime migration procedure, `docs/RUNBOOK.md` | Verified dry-run deployment, documented rollback, backup/restore drill, and payment gateway go-live checklist |

### Schedule Dependencies & Critical Path
- **External lead-time gate (start in Week 1):** Merchant onboarding and sandbox/production credentials for **SSLCommerz, bKash Tokenized Checkout, Nagad**, and the **Bangladeshi SMS gateway** should be initiated in parallel during Phase 1 so credentials are ready before Phase 5.
- **Hard gate before Phase 7:** The signed-off compensation plan (binary/unilevel rules, rank ladder, caps, TDS/service-charge deductions) must be finalized before Phase 7 implementation begins.

---

## 3. Risk Register & Mitigations

| # | Risk | Severity | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | **Workspace Runtime vs. Target Stack Mismatch** *(Environment Fact)* | **Critical** | The current AI Studio sandbox runs Node 22 + `npm` on a Vite/React/Express template and does **not** have `docker`, `pnpm`, local Redis, or local MinIO installed. Attempting to run `docker compose up` inside this sandbox will fail. | Decide in Phase 0 (see Question 1) whether to: (a) run live preview on React/Vite/Express + managed PostgreSQL (Cloud SQL) while still shipping production `docker-compose.yml`/Nginx/CI files, or (b) author a strict Next.js 15 + Prisma + Docker repo intended to be pulled and executed on a Docker-capable host. |
| **R2** | **Ambiguous or Changing Compensation Plan Rules** | **High** | Direct-sales payout bugs cause financial loss, clawback disputes, and member distrust. | Enforce strict "no invented rules" policy. Keep all rates/criteria configuration-driven, block Phase 7 until the full signed-off compensation plan is supplied, and mandate dry-run review + locking + 100% fixture test coverage. |
| **R3** | **Bangladesh Payment Gateway Onboarding & Sandbox Quirks** | **High** | bKash Tokenized Checkout, Nagad, and SSLCommerz require merchant credentials, IP whitelisting (production), and strict callback/query verification. Redirect URLs can be spoofed. | Implement a clean `PaymentProvider` interface; always execute server-to-server payment verification/query API calls before marking an order paid; log raw webhook payloads in `PaymentEvent`; enforce idempotency keys. |
| **R4** | **Bangladesh Regulatory & Legal Compliance** | **High** | Bangladesh's Digital Commerce Operation Guidelines (2021) mandate strict delivery/refund timelines, escrow/settlement rules, and transparent pricing; direct-selling/MLM laws carry specific licensing obligations. | Make all legal policies (Terms, Privacy, Return/Refund, Member Agreement) admin-editable CMS pages with versioning, keep invoice/VAT and TDS/service-charge hooks configurable, and flag legal copy for company legal counsel review before launch. |
| **R5** | **NID & KYC PII Data Exposure** | **High** | NID numbers, front/back scans, and selfies are high-sensitivity personal data. | Encrypt NID at application layer (AES-256-GCM with key rotation support), store a blind index/hash only if uniqueness checks are required, mask NID (`**** **** 1234`) in all responses, keep KYC files in a private S3/R2 bucket with short-lived signed URLs, and log every admin view in `AuditLog`. |
| **R6** | **Large Network Tree Query Performance** | **Medium** | Loading deep binary/unilevel trees recursively can time out on PostgreSQL or freeze low-end Android browsers. | Use materialized path or closure table alongside `sponsorId`/`placementParentId` + `placementSide`, enforce depth-limited lazy loading (e.g. 2–3 levels per request), and maintain pre-aggregated leg PV snapshots per period. |
| **R7** | **Low-End Android & Slow Mobile Data UX** | **Medium** | Heavy JS bundles, unoptimized product images, and Bangla webfont payload (~1MB+) hurt conversion and Lighthouse mobile scores. | Subset Bangla fonts (`Hind Siliguri` / `Noto Sans Bengali`), serve WebP/AVIF responsive images, code-split admin/dealer/tree routes, and optimize critical storefront paths for Lighthouse mobile ≥ 90. |
| **R8** | **Inventory Overselling Across Central Warehouse & Dealers** | **Medium** | Flash deals or simultaneous storefront + dealer POS orders can oversell stock. | Perform atomic conditional stock reservations inside DB transactions (`WHERE available >= qty`) with immutable `StockMovement` logs and automatic reservation release on abandoned/cancelled orders. |

---

## 4. Open Questions Requiring Stakeholder Answers (Before Phase 1)

Please review and answer the questions below. Items marked **[Needed for Phase 1–2]** block early setup; items marked **[Needed before Phase 7]** can be provided now or before Phase 7 (in the meantime we will use `TODO: confirm` placeholders in admin-editable settings).

### A. Environment & Stack Alignment **[Needed for Phase 1]**
1. **Live preview environment vs. target repo stack:** This build environment currently has Node 22 + `npm` (no `docker`, no `pnpm`, no local Redis/MinIO, and the live preview runs Vite + Express on port 3000). Which mode do you prefer?
   - **Option A (Live-runnable here + production Docker bundle):** Build the working full-stack app using this environment's **React 19 + Vite + Express + TypeScript + Tailwind + shadcn/ui** + **managed PostgreSQL (Cloud SQL)** (with an in-process queue/storage adapter for dev preview and Redis/BullMQ + S3/R2 + Docker/Nginx configs ready for production).
   - **Option B (Strict Next.js 15 repo):** Scaffold strictly **Next.js 15 (App Router) + Prisma + next-intl + BullMQ + Docker Compose** as specified in `SPEC.md`, understanding that `docker compose up` (Postgres/Redis/MinIO/Mailpit) will be executed on your local machine/VPS rather than inside this sandbox.
2. **Git workflow:** There is no `.git` repository initialized yet in this workspace. Should we initialize git locally so we can make one Conventional Commit per phase?

### B. Brand, Domain & Support Contacts **[Needed for Phase 1–4]**
3. **Logo & brand assets:** Please provide (or upload/link) the official **Nexus Consumers Limited** logo files (light & dark SVG/PNG) and favicon, plus any brand guidelines or tagline (in both Bangla and English).
4. **Customer support & social contacts:** What phone number(s), support email, WhatsApp/Messenger link, office hours, and social media URLs (Facebook, YouTube, Instagram, LinkedIn) should appear in the header/footer/Contact page?
5. **Corporate legal details for invoices:** What company Trade License number, BIN/VAT registration number (if applicable), and default VAT/tax handling (inclusive vs. exclusive on MRP) should print on customer invoices?

### C. Delivery, Pricing & Payments **[Needed for Phase 2–5]**
6. **Delivery charges & zones:** What are the default delivery charges and free-delivery thresholds? (e.g., Inside Dhaka Metro vs. Dhaka Suburbs vs. Outside Dhaka / Kishoreganj Sadar local pickup, weight-based surcharges, and expected delivery SLAs in days for Digital Commerce compliance.)
7. **Dealer fulfilment vs. Courier:** Will you integrate a third-party courier API (e.g., Steadfast, Pathao, RedX, Paperfly) in v1, or only assign orders to dealers and manual courier tracking numbers?
8. **Payment gateways:** Do you already have sandbox/merchant accounts for **SSLCommerz**, **bKash Tokenized Checkout**, and **Nagad**? Are there any COD limits (e.g., max order amount for COD or mandatory partial advance for outside Dhaka)?
9. **SMS & Email providers:** Which Bangladeshi SMS gateway will you use (e.g., SSL Wireless, BulkSMSBD, Greenweb, Alpha SMS, MimSMS, ElitBuzz)? Which transactional email provider (SMTP, Resend, AWS SES, Postmark)?

### D. Member Onboarding, KYC & Network Structure **[Needed for Phase 2–3]**
10. **Network tree type:** Is the network **strictly Binary** (2 legs: Left & Right, with spillover placement), **Unilevel** (unlimited width), or **Hybrid** (Sponsor tree for Direct Referral + Binary Placement tree for Matching)?
11. **Member activation requirement:** Can any registered user earn PV / buy at member price immediately, or must they first: (a) have KYC `APPROVED`, (b) purchase a starter pack / minimum activation PV, or (c) pay a registration fee?
12. **Member ID format & NID uniqueness:** What format should Member IDs follow (e.g., `NCL-000001` or `NX20260001`)? Is one NID strictly limited to one member account, or can a member hold multiple accounts?
13. **Guest vs. Member pricing visibility:** Should guests see the exact Member Price and PV on product pages, or only "Login as member to unlock member savings + PV"?

### E. Compensation Plan, Ranks & Withdrawals **[Needed before Phase 7 — `TODO: confirm` until provided]**
14. **PV rules:** How is PV defined per product (manual per variant, or formula-based)? Is there a monthly active PV maintenance requirement to qualify for commissions?
15. **Full rank ladder:** Please share the complete list of ranks from **PSM** up to **Nexus Ambassador**, including exact qualification criteria (Personal PV, Left/Right Team PV, direct rank counts, or time window) and any one-time rank rewards.
16. **Bonus types & rates:** Please provide the exact rules for every active bonus type:
    - **Direct / Reference Bonus:** percentage(s), single-level or multi-level?
    - **Matching / Binary Bonus:** pairing ratio (e.g., 1:1, 1:2), payout per matched PV/pair, daily/weekly/monthly **capping** per rank, and **carry-forward vs. flush-out** policy on weak/strong legs.
    - **Retail Profit:** difference between MRP and Member Price, or separate wallet credit?
    - **Royalty / Leadership Pool:** eligibility ranks, pool percentage of company PV/turnover, and distribution formula.
    - **Any other bonuses** (e.g., Generation, Repurchase, Car/House fund)?
17. **Payout cycle & deductions:** What is the commission run cycle (daily, weekly, bi-weekly, monthly)? What **TDS (tax)** and **service/admin charge** percentages apply on commissions and/or withdrawals?
18. **Withdrawal rules:** What is the minimum/maximum withdrawal amount, allowed payout channels (bKash personal/agent, Nagad, Bank transfer), withdrawal fee %, and processing SLA?

### F. Dealer / Agent Rules **[Needed before Phase 8]**
19. **Dealer commission & tiers:** Are there multiple dealer tiers (e.g., District Dealer, Upazila Dealer, Stock Point/Agent)? What commission % do dealers earn on assigned online orders vs. walk-in POS orders, and is it based on MRP, Member Price, or PV?

### G. Hosting & Operations **[Needed before Phase 11]**
20. **Production hosting:** Where will `nexusglobalplc.com` be hosted (e.g., Ubuntu VPS on DigitalOcean/Hetzner/AWS EC2, or managed cloud)? Will Cloudflare handle DNS/WAF/R2 storage?
21. **Legal & compliance policies:** Will your team supply the Bangla and English drafts for Privacy Policy, Terms & Conditions, Return & Refund Policy, and Member Agreement, or should we seed editable placeholder drafts marked for legal review?
