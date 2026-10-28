# SIMMI MASALA — Admin Implementation Plan

## Order of work

1. **Critical — Order ops UX + honest refunds**  
   Line items, cancel, refund UI; Razorpay refund when configured else explicit ledger-only; order notes API.
2. **High — Inventory atomicity + UI**  
   Atomic `adjustStock`; movements list; adjustable qty + reason.
3. **High — Categories CRUD**  
   Model fields (image, sortOrder, archive); PATCH; Categories admin page; seed spice categories safely.
4. **High — Customers**  
   Detail page; PATCH accountStatus + supportNotes.
5. **High — Settings & CMS lite**  
   Policies editor; ContentPage model for hero/about/banners with draft/published; public content API.
6. **High — Admin users + audit log list**  
   List/create admins (`admins:manage`); GET audit logs.
7. **Medium — Coupons update, dashboard/report dates, CSV blob download**  
8. **Medium — Product image multipart wiring**  
9. **Tests + builds + final report**

## Dependencies

- Shared types/schemas before admin RTK endpoints  
- Category model before seed expansion  
- Content model before storefront optional fetch (storefront keeps fallbacks)  
- Razorpay refund requires env keys (blocked without credentials)

## Database changes

- Category: `imageUrl`, `sortOrder`, `isArchived`  
- ContentPage collection: `key`, `title`, `blocks`, `status`, timestamps  
- No breaking Product changes (already multi-variant)

## API changes

- `PATCH /admin/categories/:id`, `POST .../archive`  
- `PATCH /admin/coupons/:id`  
- `PATCH /admin/customers/:id`  
- `PATCH /admin/orders/:id/notes`  
- `GET /admin/admins`, `POST /admin/admins`  
- `GET /admin/audit-logs`  
- `GET/POST/PATCH /admin/content`, `GET /api/v1/content/:key` (published only)  
- Refund: attempt Razorpay when configured; response includes `providerRefunded` flag

## Frontend changes

- Rewrite thin pages in `OtherPages.tsx` or split files  
- OrderDetailPage complete  
- Dashboard date filters  
- Categories, Content, Admins, Audit routes in `App.tsx` / `AdminShell`  
- Expand `store/api.ts`

## Migrations

- Seed backfill categories without duplicates  
- Content defaults for `home.hero` and `about` as draft

## Tests required

- Category create/update  
- Atomic inventory adjust  
- Customer status update  
- Coupon deactivate  
- Content publish visibility  
- Admin user create (super_admin)  
- Refund response shape when Razorpay unset

## Acceptance criteria

- Admin can manage categories, inventory, customers, coupons, settings/policies without source edits  
- Order detail shows items and supports cancel/refund with clear provider messaging  
- Published CMS content available publicly; drafts are not  
- Lint, typecheck, unit/integration tests, and production builds pass  
- No fake dashboard numbers or invented FSSAI/claims