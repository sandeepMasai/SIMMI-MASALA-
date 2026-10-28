# SIMMI MASALA E-Commerce Platform

Production-oriented monorepo for **SIMMI MASALA** (हर रसोई की पहचान) — Indian spices from Village Salpuri, Alwar, Rajasthan 301030.

## Architecture

| App | Path | Stack |
|---|---|---|
| Storefront | `apps/storefront` | React, Vite, Tailwind, RTK Query, React Router |
| Admin | `apps/admin` | Separate React Vite app (subdomain or `VITE_BASE_PATH=/admin/`) |
| API | `apps/api` | Node.js, Express, MongoDB, Mongoose, Zod |
| Shared | `packages/shared` | Types, Zod schemas, money helpers, RBAC constants |

Applications are independently buildable and deployable.

## Prerequisites

- Node.js 20+
- pnpm 10+
- MongoDB 7 (Docker Compose included; Atlas also supported)

## Quick start

```bash
cp .env.example .env
cp apps/storefront/.env.example apps/storefront/.env
cp apps/admin/.env.example apps/admin/.env

# Start MongoDB (replica set for transactions)
docker compose up -d

# If not using Docker, point MONGODB_URI at a local/Atlas MongoDB and remove replicaSet= if unsupported.

pnpm install
pnpm --filter @simmi/shared build
pnpm seed
pnpm seed:admin
pnpm dev
```

- Storefront: http://localhost:5173  
- Admin: http://localhost:5174  
- API: http://localhost:4000  
- OpenAPI UI: http://localhost:4000/api/v1/docs  

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run API + storefront + admin |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates |
| `pnpm seed` | DEV PLACEHOLDER catalogue + settings |
| `pnpm seed:admin` | Create Super Admin from env |
| `pnpm test:e2e` | Playwright smoke (services must be up) |

## Important honesty rules

- Seed product **prices, descriptions, and images are DEV PLACEHOLDERS** — not official catalogue data.
- Policy pages are **draft** until the business owner approves them.
- No invented FSSAI, GSTIN, testimonials, awards, or courier tracking numbers.
- Razorpay / SMTP / Cloudinary stay clearly “not configured” until credentials are provided.
- Server recalculates all money and stock; clients are never trusted for totals or payment status.

## Auth & security

- HttpOnly session cookies (`simmi_session` / `simmi_admin_session`) + CSRF double-submit (`simmi_csrf` / `x-csrf-token`).
- Passwords hashed with Argon2id.
- Admin RBAC enforced on the API (`super_admin`, `product_manager`, `order_manager`, `support_manager`).
- No public admin registration.

## Payments

1. Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
2. Webhook URL: `https://<api-host>/api/v1/payments/razorpay/webhook` (raw body signature verification).
3. Until configured, use **COD** when enabled in store settings.
4. Do not claim live payments work without end-to-end verification with real keys.

## Inventory

- Soft reservation at checkout (`RESERVATION_TTL_MINUTES`, default 15).
- Atomic stock guards; commit on COD accept / Razorpay verify+webhook; restore on cancel/expiry.
- Prefer MongoDB replica set for transactions (Compose starts a single-node `rs0`). Standalone Mongo falls back to non-transactional guarded updates.

## Deployment (independent)

- **Storefront / Admin**: Vercel, Netlify, or static hosting (`pnpm --filter @simmi/storefront build`, same for admin). Set `VITE_API_BASE_URL` and CORS origins on the API.
- **API**: Render, Railway, or any Node host — `pnpm --filter @simmi/api build && pnpm --filter @simmi/api start`.
- **DB**: MongoDB Atlas (replica set).
- **Images**: set `STORAGE_PROVIDER=cloudinary` (+ credentials) for production; local disk is for development only.
- Use HTTPS; set `COOKIE_SECURE=true` and a strong `SESSION_SECRET`.

## Health

- `GET /health` — liveness  
- `GET /ready` — Mongo readiness  

## Troubleshooting

- **CSRF errors**: call `GET /api/v1/auth/csrf` (frontends do this automatically) and send `x-csrf-token`.
- **CORS**: ensure `CORS_ORIGINS` includes both frontend origins with credentials.
- **Transactions**: if Mongo is standalone, inventory still works via guarded updates; use replica set for stronger consistency.
- **Email not sent**: expected when SMTP env vars are empty — reset tokens may appear in API response only in non-production.

## Contact defaults (editable in admin)

- Phone / WhatsApp: 9772512267  
- Email: SimmiMasala@gmail.com  
- Address: Village Salpuri, Alwar, Rajasthan 301030  
