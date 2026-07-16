# Diet Time Admin

Production-oriented React administration portal for Diet Time. It uses the Diet Time emerald/lime/marshmallow palette, Material UI, strict TypeScript, React Router, TanStack Query, React Hook Form/Zod, and bilingual English/Arabic rendering.

## Local development

Requires Node.js 22+ and npm 10+.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the ASP.NET API root, such as `https://api.diettime.com/api/v1`. Browser-exposed Vite variables must never contain database credentials, signing keys, storage secrets, or payment secrets.

Environment variables:

- `VITE_API_BASE_URL` — required API root
- `VITE_APP_NAME` — defaults to Diet Time Admin
- `VITE_DEFAULT_LANGUAGE` — `en` or `ar`
- `VITE_ENABLE_ARABIC` — enables Arabic UI
- `VITE_IDLE_TIMEOUT_MINUTES` — inactivity timeout, default 30
- `VITE_UPLOAD_MAX_MB` — browser upload limit, default 8; backend remains authoritative

## API and authentication

All data flows through the Diet Time API; the browser never connects to PostgreSQL. Axios sends credentials for an HttpOnly refresh cookie, keeps short-lived access tokens in memory, refreshes once after a 401, and handles 403 globally. Authentication uses `/auth/login`, `/auth/refresh`, `/auth/logout`, and `/auth/me`.

The backend must allow the exact admin origin (`https://admin.diettime.com`), credentials, required methods/headers, and expose correlation headers. Do not combine wildcard origins with credentials. Backend authorization and validation remain authoritative.

Roles represented are Admin, Dietitian, ContentManager, Finance, Operations, and Viewer. Admin bypasses presentation guards. Dietitian and ContentManager editing actions are guarded in their catalogue areas; the final OpenAPI permission contract should drive remaining finance/operations mutations.

## Image upload and time handling

The portal requests a presigned URL from `POST /admin/media/upload-url`, uploads a validated JPEG/PNG/WebP directly to storage, then attaches the object key with `POST /admin/meals/{id}/media`. Storage credentials never enter the SPA.

Availability fields are presented as Qatar time (`Asia/Qatar`, UTC+3). Local input is converted to ISO-8601 UTC before submission. Backend responses are formatted with the `Asia/Qatar` IANA zone. The backend must repeat range, subscription-impact, plan compatibility, and overlap validation transactionally.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The unit suite covers meal/nutrition/availability rules and role guards. Playwright provides the browser harness; authenticated critical paths need API fixtures matching the final OpenAPI contract.

## Railway deployment

Create a Railway service from this repository using the Dockerfile. Set build argument `VITE_API_BASE_URL` to the production API root and expose port 80. Add `admin.diettime.com` as the custom domain and configure its DNS using Railway’s target. Verify `/health`, then add the final origin to ASP.NET CORS and refresh-cookie settings. Vite variables are compiled at build time, so rebuild after changing them.

## Adding master data

Add the resource to the `MasterResource` allow-list, add a dedicated API adapter when its contract differs, and register its localized route/sidebar item. Keep business-specific Zod rules in the feature rather than expanding a generic CRUD abstraction.

## Contract gaps

No OpenAPI document was present. Documented meal, master-data, meal-plan, media, and audit endpoints are wired. Dashboard aggregation, general pricing, media listing, settings, variants, transactional aggregate saves, exports, duplicate checks, impact checks, and reusable slot schemas still need confirmed backend endpoints. Generate/align types from the real OpenAPI schema before production integration.
