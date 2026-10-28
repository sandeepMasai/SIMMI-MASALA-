# SIMMI MASALA — Admin Implementation Report

**Date:** 2026-10-28  
**Related docs:** `docs/admin-audit-report.md`, `docs/admin-implementation-plan.md`

## Summary

Inspected the monorepo, documented gaps, then implemented missing/high-priority Admin Panel capabilities against the existing Express + MongoDB stack. Working product CRUD and auth were preserved.

## Features already present (kept)

- Admin login (cookie session + CSRF + Argon2id)
- Server RBAC middleware (`authorize`)
- Dashboard KPIs from Mongo aggregations
- Product multi-variant CRUD + archive
- Order list + status transitions service
- Inventory reservation (atomic) for checkout
- Coupon create + checkout validation
- Settings GET/PATCH (secrets stay in env)
- Razorpay create/verify/webhook signature helpers

## Incomplete → completed in this pass

| Area | Before | After |
|------|--------|-------|
| Categories | GET/POST only, no UI | PATCH/archive, product counts, Categories page, spice category seed |
| Inventory | +10 stub, non-atomic adjust | Atomic `$inc` adjust; qty/note UI; movements list |
| Orders | Status only in FE | Line items, cancel, refund, notes, providerRefunded messaging |
| Customers | List only | Detail page, notes, account status PATCH |
| Coupons | Sample create | Form + PATCH activate/deactivate |
| Settings | Brand/shipping only | Policies editor |
| Dashboard/Reports | No date UI | from/to filters |
| CMS | Missing | ContentPage model; admin Content page; public `GET /content/:key` (published only); storefront home/about consume published blocks with fallbacks |
| Admins | Seed only | List/create/update with `admins:manage` |
| Audit logs | Write-only | `GET /admin/audit-logs` + Audit page |
| Refunds | Ledger-only silently | Calls Razorpay when configured; otherwise returns explicit ledger-only note |

## Files changed (high level)

### Docs
- `docs/admin-audit-report.md` (new)
- `docs/admin-implementation-plan.md` (new)
- `docs/admin-implementation-report.md` (this file)

### API
- `apps/api/src/modules/admin/admin.routes.ts` — categories, notes, refunds, customers, coupons, admins, audit, content
- `apps/api/src/modules/categories/category.model.ts` — image/sort/archive
- `apps/api/src/modules/content/content.model.ts` (new)
- `apps/api/src/modules/inventory/inventory.service.ts` — atomic adjust
- `apps/api/src/integrations/razorpay/razorpay.service.ts` — `createRazorpayRefund`
- `apps/api/src/app.ts` — public content route
- `apps/api/src/scripts/seed.ts` — spice categories + draft content
- `apps/api/src/tests/api.integration.test.ts` — categories/content/customer/audit

### Admin
- `store/api.ts`, `App.tsx`, `AdminShell.tsx`
- `DashboardPage.tsx`, `OrderDetailPage.tsx`, `OtherPages.tsx`
- New: `CategoriesPage`, `CustomerDetailPage`, `ContentPage`, `AdminsPage`, `AuditLogsPage`

### Storefront
- `store/api.ts` — `getContent`
- `HomePage.tsx`, `AboutPage.tsx` — published CMS blocks with fallbacks

## Database schema changes

- **Category:** `imageUrl`, `sortOrder`, `isArchived`
- **ContentPage (new):** `key`, `title`, `status` (`draft`|`published`), `blocks`, `publishedAt`
- Products unchanged (already multi-variant)

## API endpoints added/changed

| Method | Path | Notes |
|--------|------|-------|
| PATCH | `/api/v1/admin/categories/:id` | Update |
| POST | `/api/v1/admin/categories/:id/archive` | Safe archive |
| PATCH | `/api/v1/admin/orders/:id/notes` | Internal notes |
| POST | `/api/v1/admin/orders/:id/refund` | Provider when configured |
| PATCH | `/api/v1/admin/customers/:id` | Status/notes |
| PATCH | `/api/v1/admin/coupons/:id` | Update/deactivate |
| GET/POST | `/api/v1/admin/admins` | Manage admins |
| PATCH | `/api/v1/admin/admins/:id` | Role/status |
| GET | `/api/v1/admin/audit-logs` | Paginated |
| GET/PUT | `/api/v1/admin/content`, `/content/:key` | CMS |
| GET | `/api/v1/content/:key` | Published only |

## Tests executed

| Suite | Result |
|-------|--------|
| `@simmi/shared` product schema tests | 7 passed |
| `@simmi/api` vitest (integration + pricing + razorpay) | **13 passed** |
| `@simmi/storefront` ProductCard | 1 passed (prior) |
| API / admin / storefront typecheck | passed |
| Admin + storefront production builds | passed |
| API / admin / storefront lint | passed |
| Playwright admin e2e | **not run / not added** — blocked as incomplete coverage |

## Configuration still required

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` for live/test provider refunds & checkout
- SMTP for email notifications
- Cloudinary (optional) for production image hosting
- MongoDB replica set for multi-doc transactions (optional; code falls back)
- Publish CMS content from Admin → Content (`home.hero`, `about`) — seeded as **draft**
- Official product photography/copy before removing placeholder flags

## Remaining known issues

1. **Commit/release reservation** paths still use read-modify-write (reserve/adjust are safer).
2. **Product image multipart** upload API exists; product form still primarily uses image URLs.
3. **Order CSV** download should use authenticated fetch/blob in FE (link may fail cross-origin).
4. **Admin e2e** Playwright flow not yet automated.
5. **Nav RBAC** still shows all links; API continues to enforce permissions.
6. Live Razorpay refunds **blocked** until credentials are configured and manually verified.

## Honesty statement

No feature was marked complete without code + automated checks where applicable. External payment provider refunds are implemented in code but **not claimed verified live**. CMS drafts are not publicly readable.