# SIMMI MASALA — Admin Panel Audit Report

**Date:** 2026-10-28  
**Scope:** `apps/admin`, `apps/api` admin modules, `packages/shared`, related storefront consumers  
**Method:** Code inspection of routes, models, pages, RTK Query wiring, and existing tests. Features are not marked Implemented unless FE + API + auth + persistence connect.

## Stack confirmed

| Layer | Path | Stack |
|-------|------|--------|
| Storefront | `apps/storefront` | React + Vite + TS + Tailwind + RTK Query |
| Admin | `apps/admin` | React + Vite + TS + Tailwind + RTK Query + RHF + Zod |
| API | `apps/api` | Express + TS + Mongoose, `/api/v1` |
| Shared | `packages/shared` | Zod schemas, DTOs, RBAC |
| Monorepo | root | pnpm workspaces + Turborepo |

## Status legend

- **Implemented** — Functional end-to-end and verified in code/tests where available  
- **Partial** — Exists but incomplete UX, missing endpoints, or unsafe edge cases  
- **Missing** — Not implemented  
- **Broken** — Present but incorrect for production use  
- **Needs verification** — Requires runtime/credentials to confirm

---

## Feature matrix

| Feature | Status | Frontend | Backend | Model | Auth | Tests | Issue | Required fix | Priority |
|---------|--------|----------|---------|-------|------|-------|-------|--------------|----------|
| Admin login / session / CSRF | Implemented | `LoginPage.tsx`, `lib/api.ts` | `auth.routes.ts`, `session.ts` | User | Admin cookie + CSRF | Integration login | — | Keep | — |
| RBAC middleware | Implemented | Soft (nav not gated) | `authenticate.ts` + `authorize` | roles.ts | Server-enforced | 401 test | FE shows all nav | Gate nav by permission | Medium |
| Dashboard KPIs | Partial | `DashboardPage.tsx` | `GET /admin/dashboard` | Order, Product | reports:read | Dashboard smoke | No date filter UI; API supports from/to | Wire filters + recent orders table | High |
| Product CRUD + variants | Implemented | `ProductsPage`, `ProductFormPage` | CRUD + archive | Product | products:* | Create/update/SKU tests | Image multipart unused (URL-only) | Wire upload button | Medium |
| Category management | Partial | Only category select in product form | GET/POST only | Category | products:* | None | No PATCH/archive/UI/image/order | Full CRUD + Categories page | High |
| Inventory list/adjust | Partial | Thin `InventoryPage` (+10 only) | GET/adjust/movements | Product, InventoryMovement | inventory:* | None | Adjust not atomic; movements unused in FE | Atomic adjust + full UI | High |
| Order list/filters | Partial | `OrdersPage.tsx` | GET /orders | Order | orders:read | None | Customer search limited | Improve filters | Medium |
| Order detail / status | Partial | `OrderDetailPage.tsx` | status/cancel/refund | Order | orders:write | Transitions in service | No line items/cancel/refund/notes UI | Complete order detail | Critical |
| Order CSV export | Needs verification | Raw `<a href>` | GET export/csv | Order | orders:read | None | Cross-origin cookie download may fail | Authenticated blob download | High |
| Customer list | Partial | `CustomersPage` list only | GET list/detail | User | customers:read | None | Detail unused; no write | Detail page + status/notes | High |
| Coupons | Partial | Sample create button | GET/POST | Coupon | coupons:* | Pricing service | No PATCH/deactivate form | Full coupon form | Medium |
| Payments / Razorpay | Partial | Payment blob on order | create/verify/webhook | Payment | — | Signature tests | Admin refund is ledger-only | Provider refund + honest UI | Critical |
| Refunds | Broken (for live) | Missing UI | Local status flip | Refund | orders:write | None | Marks refunded without Razorpay API | Call Razorpay refunds when configured; else label “ledger-only” | Critical |
| Reports | Partial | Daily list | GET reports/sales | Order agg | reports:read | None | No date UI/CSV/pack report | Date filters + exports | Medium |
| Store settings | Partial | Brand/shipping/COD | GET/PATCH settings | StoreSettings | settings:* | None | Policies/logo/featured not in UI | Expand settings form | High |
| CMS / website content | Missing | Hardcoded storefront pages | Policies via settings only | — | — | None | No banners/CMS publishing | Content model + admin CMS | High |
| Admin users | Missing | None | Seed script only | User | admins:manage unused | None | No invite/list/disable | Admin users API + UI | High |
| Audit logs | Partial | None | Write-only helper | AdminAuditLog | — | None | No list API/UI | GET /admin/audit-logs + page | High |
| Reviews moderation | Missing | None | Public review model only | Review | — | None | No admin routes | Optional later | Low |

### Revenue definition (documented)

Paid revenue = orders with `paymentStatus: 'paid'` and `status` not in `cancelled` / `refunded`. COD pending is **not** paid revenue. Refunded amounts are excluded once status becomes refunded.

### Inventory concurrency

| Op | Safe? |
|----|-------|
| `reserveStock` | Yes (atomic pipeline) |
| `releaseReservations` / `commitReservations` / `adjustStock` | Partial / No (read-modify-write) |

Replica set recommended for multi-document transactions (`withOptionalTransaction` already falls back when unsupported).

---

## Admin API inventory (`/api/v1/admin`)

Present: dashboard, products CRUD/archive/images, categories GET/POST, inventory GET/adjust/movements, orders list/detail/status/cancel/refund/csv, customers list/detail, coupons GET/POST, reports/sales, settings GET/PATCH.

Missing: category PATCH/archive, coupon PATCH, customer PATCH, order notes PATCH, admin users CRUD, audit log list, CMS, Razorpay provider refund.