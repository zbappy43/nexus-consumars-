# CLAUDE.md — Nexus Consumers Limited Platform

Current phase: Phase 0 (Discovery & Plan — awaiting stakeholder answers & approval)

---

## Project summary

Production e-commerce and direct-sales (member / PV / commission / dealer) platform for **Nexus Consumers Limited** (sister concern of Nexus Group of Companies / Nexus Global PLC), operating in Bangladesh (`nexusglobalplc.com`).

- **Corporate Office:** 103, New Town, Kishoreganj Sadar, Kishoreganj, Bangladesh
- **Market / Locale:** Bangladesh · Currency: BDT (`৳`) · Timezone: `Asia/Dhaka` · Languages: Bangla (`bn`, default) & English (`en`)
- **Brand Palette:** Navy `#13204A`, Gold `#E8892B`, White `#FFFFFF`
- **User Personas:** Guest/Customer (MRP), Member/Partner (KYC, member price, PV, referral network, wallet/commissions), Dealer/Agent (regional stock point, order fulfilment, POS, dealer commission), and Admin Staff (RBAC roles).

Full requirements live in `docs/SPEC.md`. Delivery roadmap and open questions live in `docs/PLAN.md`.

---

## Tech stack

### Target production stack (from `docs/SPEC.md`, pending Phase 0 environment alignment)
- **App:** Next.js 15 (App Router) + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui, `lucide-react`, `react-hook-form` + `zod`
- **i18n:** `next-intl` (`bn` default, `en`)
- **Database:** PostgreSQL 16 + Prisma ORM
- **Cache / Queues:** Redis + BullMQ
- **Auth:** Auth.js (NextAuth v5) — mobile + password & mobile OTP, server-side RBAC
- **Storage:** S3-compatible (Cloudflare R2 in prod / MinIO locally); KYC files in private bucket via signed URLs
- **Search:** PostgreSQL `pg_trgm` behind a swappable `SearchProvider` interface
- **Payments:** COD, SSLCommerz, bKash Tokenized Checkout, Nagad behind a single `PaymentProvider` interface
- **SMS:** Bangladeshi SMS gateway behind `SmsProvider` (console provider in dev)
- **Testing:** Vitest (unit/integration), Playwright (e2e)
- **Observability:** `pino`, Sentry, `/api/health`
- **Deploy:** Multi-stage Docker, `docker-compose`, Nginx + Let's Encrypt, GitHub Actions CI
- **Package Manager:** `pnpm`

### Current sandbox workspace note (detected in Phase 0)
This workspace currently runs Node `v22.23.2` + `npm` (`10.9.8`) on a Vite 8 + React 19 + Express template without `pnpm`, `docker`, or `git` pre-installed. See **Open Question #1** in `docs/PLAN.md` for choosing between adapting the live preview stack (React + Express + managed PostgreSQL, plus Docker deployment artifacts) vs. scaffolding a strict Next.js 15 + Docker repository.

---

## Standard commands

```bash
# Infrastructure (PostgreSQL, Redis, MinIO, Mailpit)
docker compose up -d

# Development & Production Build
pnpm dev
pnpm build

# Quality Checks & Tests
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e

# Database (Prisma)
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma db seed
```

| Task | Target Spec Command | Current Workspace Script |
|---|---|---|
| Dev server | `pnpm dev` | `npm run dev` |
| Production build | `pnpm build` | `npm run build` |
| Lint | `pnpm lint` | `npm run lint` (`tsc --noEmit`) |
| Typecheck | `pnpm typecheck` | *(to be added in Phase 1)* |
| Unit / integration tests | `pnpm test` | *(to be added in Phase 1)* |
| E2E tests | `pnpm test:e2e` | *(to be added in Phase 1)* |
| Prisma generate | `pnpm prisma generate` | *(to be added in Phase 2)* |
| Prisma migrate (dev) | `pnpm prisma migrate dev` | *(to be added in Phase 2)* |
| Prisma seed | `pnpm prisma db seed` | *(to be added in Phase 2)* |
| Local infra | `docker compose up -d` | *(not available inside sandbox)* |

---

## Non-negotiable coding conventions

1. **Money & PV Integrity**
   - Store all money as **integer paisa** (`BigInt` or `Int`, where `100 paisa = ৳1`). Never use floating-point numbers for currency.
   - Format all currency through a single helper (`src/lib/money.ts`).
   - Store PV as an integer or fixed-precision decimal — never a float.
   - `OrderItem` rows must **snapshot** unit MRP, unit member price, and unit PV at checkout time.
   - Wallets must use a **double-entry ledger** (`LedgerEntry`). Never mutate a wallet balance without creating corresponding ledger entries inside the same DB transaction.
   - Every financial mutation (payment webhook, commission post, refund reversal, withdrawal) must run inside a DB transaction and enforce **idempotency keys**.
2. **Zero Invented Business Rules**
   - Never hard-code commission percentages, binary matching rules, caps, rank criteria, PV values, withdrawal fees, delivery charges, or legal policy text.
   - Store all configurable business parameters in admin-editable `Setting` / `Rank` tables or seed values explicitly tagged `TODO: confirm`.
3. **Architecture & Boundaries**
   - All business logic lives in `src/server/modules/<domain>/` services — never inside UI components or thin route handlers.
   - External integrations (payments, SMS, storage, search, bonus calculators) sit behind strict TypeScript interfaces (`PaymentProvider`, `SmsProvider`, `StorageProvider`, `SearchProvider`, `BonusCalculator`).
4. **Security & Privacy**
   - Validate all external inputs and environment variables with `zod` (`src/lib/env.ts`). No secrets in code.
   - Enforce RBAC via a centralized permission matrix (`src/lib/rbac.ts`) on the server — never rely on UI hiding or scattered role-name checks.
   - Encrypt NID numbers at the application level (AES-256-GCM) and mask in all UI/API responses (`**** **** 1234`).
   - Store KYC documents in a private bucket and serve strictly through short-lived signed URLs after RBAC checks.
   - Soft-delete `User`, `Product`, and `Order` records; write an `AuditLog` entry for every admin action and sensitive state change.
5. **i18n & Mobile-First UX**
   - Zero hard-coded UI strings; all copy lives in `bn` (default) and `en` message dictionaries.
   - Optimize for low- to mid-range Android devices on slow mobile data (small JS bundles, lazy-loaded trees/charts, optimized WebP/AVIF images, WCAG 2.1 AA).
6. **Workflow Discipline**
   - Plan before coding every phase; wait for explicit approval.
   - One phase per session; do not advance until instructed to "continue".
   - Prefer boring, well-maintained libraries; justify every new dependency in one line.
   - Keep `CLAUDE.md` updated at the end of every phase.
