# Diet Time Admin

## Master-data export, customer sorting and meal filters

Use **Export English / Arabic** on categories, ingredients, allergens, meal types, Meals or Meal Plans. Each file contains only that screen's dataset. The CSV has exactly two columns: English and Arabic. Names and existing descriptive text are paired on successive rows; unused optional fields are omitted, while missing translations remain blank. IDs, codes, statuses, versions, field labels and review columns are excluded. Meals exports current catalogue revisions; Meal Plans exports the selected template. Arabic remains Excel-compatible UTF-8, with safe CSV quoting for commas, quotes, multiline text and formula-like values.

The authenticated GET /api/v1/admin/master-data/export (also /api/admin/master-data/export) now requires resource=meal-categories|ingredients|allergens|meal-types|meals|meal-plans. Meal Plans supplies planId for the selected template. Missing or unsupported resources return 400; there is no combined all-master export. Existing Admin, Dietitian and ContentManager access remains unchanged. No customer, order, payment or health data is exported, and no schema or migration changes are required.

Dashboard now appears first in the sidebar. The Customers screen adds server-side sorting by name, most booked plans, latest order and newest customer, preserving search and resetting pagination when sorting changes. The existing customer endpoint accepts sort=name_asc|name_desc|booked_desc|latest_order_desc|newest_desc. Booked-plan sorting uses confirmed, active and completed orders; rejected/cancelled/pending orders are excluded. Null latest-order dates sort last and customer IDs provide stable pagination ties.

Meals now pass the status query through to the database before counting or pagination. Draft, Active, Inactive and Archived match their saved lifecycle states; availability remains separate. Search and status work together, clearing status restores the full list, and invalid API status values return 400. The status control also has an associated accessible label.

Validation: 24 targeted React/API-adapter/sidebar tests, 7 CSV unit tests, 4 API integration tests (3 with isolated PostgreSQL, 1 authorization test) and 4 desktop/mobile Chromium tests passed. API build, TypeScript, targeted ESLint and the production SPA build passed. Checks cover complete exports beyond 100 records, inactive records, actual Arabic text/BOM, missing translations, CSV escaping, read-only behavior, unauthorized callers, global customer sorting and filtered meal counts/pagination. Test data and the sample CSV are synthetic; no application database was used. Deploy API and SPA together. No Flutter changes are required.


## Dashboard customer insights

The dashboard replaces Orders by day with a top-five customer booking chart and counters for customers with bookings, repeat customers, new customers and total booked orders. Customer links reuse /customers?customerId={id} and appear only with Customers read permission. Existing operational cards and scheduled orders remain available; minute polling refreshes the new panel with the dashboard.

Each confirmed, active or completed order counts as one booked plan; service days and meals never multiply the count. Pending, rejected and cancelled orders are excluded, independently of payment state. Totals and ranks include purchases placed before the end of the selected Qatar date. Repeat customers have at least two counted bookings; repeat share uses all customers with counted bookings. New customers means first counted booking in the inclusive 30-day period ending on the selected date. Ranks use booked count descending, most recent booking, then customer ID for deterministic ties. These are current approval states filtered by placement date, not reconstructed historical approval states.

The existing GET /api/v1/admin/dashboard/operations response adds customerInsights. Existing Admin/Operations API authorization is preserved. Analytics are aggregated in PostgreSQL; only the five leading customer names are fetched in one batch. No schema, migration, revenue information or customer-app change is required. Deploy API and SPA together; an older API shows an unavailable state instead of invented counts.

Validation: 12 targeted frontend tests, 8 backend dashboard unit tests, 2 real PostgreSQL integration tests and 2 desktop/mobile Chromium tests passed. TypeScript, targeted ESLint and the production SPA build passed. Checks cover purchase counts, excluded statuses, repeat share, first-booking cohorts, Qatar midnight boundaries, empty states, existing dashboard behavior, customer actions and responsive layout. Browser examples use synthetic data; the isolated PostgreSQL cluster uses no application data.


## Kitchen Preparation PDF

The existing Download PDF action produces an A4 landscape report using the Admin palette: dark green (#00684F), mint, white and subtle grey. Every page has the embedded Diet Time logo, report title, service date, Qatar generation timestamp, page number and footer. The overview counts orders, unique customers, meal items, deliveries and takeaways for the selected date.

Customer sections group orders by customer ID and keep them adjacent, with prominent customer names, order numbers, alternating subtle backgrounds and separate delivery/collection location blocks per order. Small groups stay together when they fit; larger groups and long orders paginate with repeated customer/location/allergen headings. Meals retain their configured categories, quantities, food preferences and allergen notes. Allergens are red, and selection status/source codes are omitted.

Home delivery uses the historical order address snapshot, including building, street, unit, zone, area, directions and coordinates. Only when the snapshot is completely absent can the explicitly linked, customer-owned address be used. The current default address is never substituted. Generic map labels are discarded; incomplete addresses show "Address verification required" while retaining known location details. Valid coordinates include an Open map link. Takeaway uses saved branch details, with a linked branch fallback for missing snapshot fields.

Deploy the API to apply the PDF changes; existing endpoints and preparation eligibility remain unchanged. No migration, SQL script or Flutter change is needed. Validation: 27 report/preparation/location unit tests and 2 isolated PostgreSQL integration tests passed. The synthetic seven-page report covers five customers, six orders, deliveries, takeaways, long addresses, allergens, customer grouping and map links. Rendered overview, delivery, takeaway and missing-address pages were visually reviewed. The sample is available at artifacts/kitchen-preparation-customer-report.pdf.


Preparation Summary review warnings and their PDF export identify orders by their order number (for example, `ORD-20261102-000085`), rather than internal database IDs. This covers meal-assignment warnings, legacy-lock warnings and uninitialized service days. Missing order numbers display “Order number not recorded.” The change is supplied by the API; preparation quantities and stored review reasons remain unchanged.

## Customer directory

The sidebar groups Daily Orders and Customers under Orders. The group opens automatically on either screen and on linked order details; each child retains its own read permission, and the group is hidden when neither child is accessible. Group and child labels support English and Arabic.

The separate Customers sidebar screen (`/customers`) lists saved customer profiles with name, phone/email, booked plans, active and paused plans, pending orders and latest order date. Search by name, phone or email; results are paginated on the server. Refresh and minute polling update the list without reloading the page. Search, page and the selected customer are kept in the URL.

View a customer to open a responsive, read-only details drawer with contact information, profile creation date, preferred language, booking/status counts and independently paginated order history. View order opens the existing order-details screen when Orders read access is available. Customers with no orders are included. No health/questionnaire information or editing controls are added.

Plans booked counts one order per confirmed, active or completed purchase, regardless of its meal items or number of service days. Pending/legacy-pending, cancelled and rejected orders have separate counts and are excluded from booked plans. Active now counts fulfillment-eligible Confirmed/Active orders spanning today's Qatar date; current pauses are counted separately. Latest order includes all submission statuses. These totals use all customer orders, not just the visible history page.

The matching API exposes Admin-only customer list, details and scoped order-history reads. Existing Admins receive a virtual read-only Customers menu if no dedicated menu exists; explicit menu configuration is preserved. No role definition, menu database insert, migration or SQL script is included. Deploy the API and Admin SPA together. Flutter, order placement, approval, fulfillment and payment behavior are unchanged by this feature.

Validation: 12 targeted React tests, 3 API/PostgreSQL integration tests and 2 Chromium desktop/mobile tests passed. Tests cover search and pagination, complete booking counts, paused/active separation, zero-booking profiles, scoped history, Admin authorization, menu visibility, drawer navigation and reuse of existing order details. Browser previews use fixture data; backend aggregation and HTTP reads were exercised against a disposable PostgreSQL 18 database. TypeScript, targeted ESLint and the production SPA/API builds passed with existing compiler/Vite advisories. No application database was modified.

Daily Orders uses a grouped filter card and a clearer order table with readable Qatar dates, delivery/takeaway icons, payment and approval badges, and horizontally scrollable columns on narrow screens. Cancelled orders do not offer Record Payment Status; the API also rejects that action with 409 (`cancelled_order_payment_locked`). Activity history retains business events, payment changes, notes and timestamps while omitting the internal actor/history ID disclosure. Stored audit history remains intact. No schema changes or migrations are included.

Notification dropdowns show the 50 newest updates only, without older-page navigation. The badge still counts all unread notifications and Mark All as Read applies to the recipient's full inbox. History remains stored. Refreshes remain limited to notification queries.

Delivered/Collected actions are unavailable for future service dates. Both the UI and API use the Qatar date; direct API requests for future service days return 409 (`service_day_in_future`). Existing badges, confirmation dialogs and historical completion remain available. No migrations or SQL scripts are added.

Validation for this update: 34 Admin frontend tests, 44 Flutter tests, 62 backend unit tests and 20 API integration tests passed. Integration tests used a disposable local PostgreSQL 18 instance, with no skips. TypeScript, targeted ESLint, Flutter analysis and the SPA production build passed. Existing compiler and Vite chunk-size advisories remain.

Production-oriented React administration portal for Diet Time. It uses the Diet Time emerald/lime/marshmallow palette, Material UI, strict TypeScript, React Router, TanStack Query, React Hook Form/Zod, and bilingual English/Arabic rendering.

## Business dashboard

The dashboard uses operational insights in place of revenue: scheduled service-day orders, active subscriptions, package meal demand and fulfillment rate. A simple seven-day green bar chart shows daily order counts with one scale, value labels and a date tooltip. The fulfillment donut keeps Delivered, Collected, Pending and Overdue counts and percentages together in a compact legend. Additional cards show popular meal/snack packages, pending approvals, overdue deliveries and subscriptions approaching their last service date. Scheduled orders open the existing order details; schedule links open the existing Delivery Calendar for the selected date.

Select a service date or use Today (Asia/Qatar). Data refreshes every 60 seconds and on manual refresh without the full-page loading overlay. A failed background refresh preserves the last loaded overview. The existing search, bell and avatar remain unchanged.

The existing `GET /api/v1/admin/dashboard/operations?date=YYYY-MM-DD` response adds `insights`; deploy the API and Admin SPA together. Fulfillment and seven-day workload reuse the Delivery Calendar's eligible service days and Qatar deadlines. Meal demand is scheduled package quantity, including snacks, and does not replace the Preparation Summary's meal-selection quantities. Fulfillment rate is `(Delivered + Collected) / scheduled service days`; it is unavailable when no service days exist. Slot bars show actual fulfilled versus scheduled orders, with no assumed slot capacity. Active subscriptions are eligible order plans spanning the selected date; renewal opportunities use their last scheduled date within the inclusive seven-day window. Popular packages count those active subscriptions, grouped by daily meal and snack quantity.

No revenue, artificial comparisons, additional roles, SQL scripts or database migrations are included. Older API responses show unavailable fulfillment/package insights rather than inferred completion values. PostgreSQL setup remains as documented for the existing fulfillment feature.

Validation: 10 targeted frontend tests and 9 dashboard backend unit tests passed. TypeScript, targeted ESLint, and the production SPA build passed. The existing Vite chunk-size advisory remains. Desktop and mobile dashboard previews were checked with fixture data; the mobile page had no horizontal overflow. Live PostgreSQL aggregation was not tested in this environment.

## Local development

Requires Node.js 22+ and npm 10+.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the ASP.NET API root, such as `https://api.diettime.com/api/v1`. Vite development and the Docker image use this as the upstream for a same-origin `/api/` proxy. Browser-exposed Vite variables must never contain database credentials, signing keys, storage secrets, or payment secrets.

Environment variables:

- `VITE_API_BASE_URL` — required API root / proxy upstream
- `VITE_API_SAME_ORIGIN` — automatically `true` in the Docker build; set to `true` for other production builds only when the host also proxies `/api/` to the API
- `VITE_APP_NAME` — defaults to Diet Time Admin
- `VITE_DEFAULT_LANGUAGE` — `en` or `ar`
- `VITE_ENABLE_ARABIC` — enables Arabic UI
- `VITE_IDLE_TIMEOUT_MINUTES` — inactivity timeout, default 30
- `VITE_UPLOAD_MAX_MB` — browser upload limit, default 15; backend remains authoritative

## API and authentication

All data flows through the Diet Time API; the browser never connects to PostgreSQL. Axios sends credentials for an HttpOnly refresh cookie, keeps short-lived access tokens in memory, restores the session through `/auth/refresh`, retries once after a 401, and handles 403 globally. Authentication uses `/auth/login`, `/auth/refresh`, `/auth/logout`, and `/auth/me`. No authentication token or session flag is stored in `localStorage`.

**Browser refresh persistence:** Vite and the Docker/Nginx image send API requests through the Admin origin. This allows the existing HttpOnly, Secure (production), SameSite=Strict refresh cookie to survive page reloads even when the upstream API is hosted on a different site. The Docker build renders its Nginx upstream from `VITE_API_BASE_URL`, retaining both `/api/v1/` and `/api/admin/` routes, TLS server-name indication, cookies and API-controlled upload limits. API cookie policy, authentication endpoints and database schema are unchanged. Temporary network errors and server failures during restoration show Retry connection on the current route; only a rejected session (401/403) redirects to login. Existing authenticated API requests also retain their session on temporary refresh failures.

Rebuild/redeploy the Admin Docker image with the current API URL build argument for this proxy fix to take effect. Sign in once after deployment so the refresh cookie is issued on the Admin origin; subsequent reloads restore the session and preserve the selected route/query. For static hosting outside this Docker image, configure an equivalent same-origin `/api/` reverse proxy and build with `VITE_API_SAME_ORIGIN=true`; setting that flag without a proxy will not work. The deployed site's behavior must be checked after rollout.

Validation for refresh persistence: 15 targeted React/API-client tests, 3 proxy/configuration checks and 3 Chromium browser tests passed. Browser tests use fixture API responses and a real HttpOnly SameSite=Strict cookie to verify sign-in, rotation on a full reload, selected-page preservation, retry after a 503 and rejection of an expired session. A local upstream server verifies real Vite proxy forwarding and cookies for versioned/unversioned API paths. TypeScript, targeted ESLint and the production build in same-origin mode passed. Docker container startup was not tested because the local Docker daemon is unavailable; the generated Nginx configuration is covered by renderer tests. No API, Flutter, database or cookie-policy changes are included.

The backend must allow the exact admin origin (`https://admin.diettime.com`), credentials, required methods/headers, and expose correlation headers. Do not combine wildcard origins with credentials. Backend authorization and validation remain authoritative.

Roles represented are Admin, Dietitian, ContentManager, Finance, Operations, and Viewer. Admin bypasses presentation guards. Dietitian and ContentManager editing actions are guarded in their catalogue areas; the final OpenAPI permission contract should drive remaining finance/operations mutations.

## Image upload and time handling

The portal uploads validated JPEG/PNG/WebP files as multipart form data to `POST /admin/meals/{id}/media/upload`. Original images use `mediaType=MEALITEM`; separately uploaded list/card thumbnails use `mediaType=THUMBNAIL`. Both are bound from the meal detail response's `media` array and previewed in the form.

Image deletion uses `DELETE /admin/meals/{mealId}/media/{mediaId}` for meal media, `DELETE /admin/meals/{mealId}/media/{mediaId}/thumbnail` for only its thumbnail, and `DELETE /admin/meal-plans/{planId}/image` for a meal-plan image. A successful response means the backend has deleted the database association and every relevant S3 object. The backend derives object keys from trusted database records rather than accepting an S3 key or URL from the browser. It returns `204 No Content` on success, `404` when the resource does not exist, and a non-success response when S3 deletion fails so the UI does not falsely remove the preview.

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

Create a Railway service from this repository using the Dockerfile. Set build argument `VITE_API_BASE_URL` to the production API root and expose port 80. The image builds the SPA in same-origin mode and generates Nginx's API proxy configuration from that upstream URL. Add `admin.diettime.com` as the custom domain and configure its DNS using Railway’s target. Verify `/health` and `/api/v1/auth/refresh` (401 is expected before signing in), then verify sign-in and browser refresh over HTTPS. Preserve the existing API cookie security and exact-origin CORS settings. Vite variables are compiled at build time, so rebuild after changing them.

## Adding master data

Add the resource to the `MasterResource` allow-list, add a dedicated API adapter when its contract differs, and register its localized route/sidebar item. Keep business-specific Zod rules in the feature rather than expanding a generic CRUD abstraction.

## Contract gaps

No OpenAPI document was present. Documented meal, master-data, meal-plan, media, and audit endpoints are wired. Dashboard aggregation, general pricing, media listing, settings, variants, transactional aggregate saves, exports, duplicate checks, impact checks, and reusable slot schemas still need confirmed backend endpoints. Generate/align types from the real OpenAPI schema before production integration.

## Order notification bell

The header globe/language button is removed. Search, breadcrumbs, navigation, the notification bell and profile avatar retain their existing toolbar layout. No notification page is added.

The bell displays a red unread count, hides zero counts, caps at 99+, and opens a compact paged inbox. Notifications include an event icon, title, message, order number, Qatar timestamp and unread highlight. Individual and bulk read actions persist on the server. The badge polls every 45 seconds; the inbox polls while open. Query observers stop polling on unmount. Cache keys include both user ID and authorization scope, so privileged cached inboxes are not reused after a role change.

The panel uses an emerald header, compact event badges, tinted event icons and separate notification cards. When available, each card shows the ordering customer's name with text such as “Sara Ali placed order …” or “Order … for Sara Ali has been confirmed.” This name comes from the order's customer profile, not the signed-in Admin. Existing inbox rows receive the richer display text from the API without a database rewrite. A refresh control updates only the notification queries.

Notification requests, calendar data refreshes, and Orders/Daily Orders requests update their own React Query data without activating the page-wide API loading backdrop. Initial loading, saving and refresh feedback stays inside the relevant panel or screen. Other API operations retain their existing loading behavior. Quiet requests, including failures, cannot decrement a separate request's loading counter. No full-page reload is used; selected dates, filters and active tabs remain in place.

Validation for this presentation/refresh update: 50 targeted React tests and 14 backend notification-text tests passed. React and API builds, TypeScript and targeted ESLint checks passed. No SQL files, migrations or live database changes were added for this update.

**Events and recipients**

| Event | Admin | Existing navigation |
| --- | --- | --- |
| New order, Pending Confirmation | Yes | Order review/details |
| Order approved | Yes | Order details |
| Order rejected or cancelled | Yes | Order details |
| Delivery overdue | Yes | Calendar date and service-day row |
| Delivered | Yes | Calendar date and service-day row |
| Collected | Yes | Calendar date and service-day row |

**API**

Both /api/admin and /api/v1/admin route prefixes are supported:

- GET /api/admin/notifications?page=1&pageSize=20 — recipient-scoped items, page metadata, total count; maximum page size 50.
- GET /api/admin/notifications/unread-count — `{ "data": { "unreadCount": 4 } }`.
- PATCH /api/admin/notifications/{id}/read — 204; 404 for another recipient's or an inaccessible notification.
- PATCH /api/admin/notifications/read-all — 204; affects only the authenticated recipient's permitted events.

Only authenticated Admin users can call these endpoints. Identity comes from validated claims; no recipient ID is accepted from requests. Every inbox and read action is scoped to that authenticated recipient. Customer and other non-Admin accounts are rejected by API authorization. No additional role is defined.

Order links reuse /orders?orderId={id} and the existing Admin-only order details screen. Approval, rejection, payment and date-change endpoints retain their existing Admin authorization. Personal notification read receipts are exempted from the client screen-write guard; order mutations remain guarded and API-authorized. No roles or screen permissions are created for this feature.

Service-day links reuse /operations/delivery-calendar?date={yyyy-MM-dd}&serviceDayId={id}. Navigation hooks select the corresponding month/date, reopen the existing drawer and scroll to the row. Calendar layout, fulfillment actions and Preparation Summary are unchanged by this feature.

**Backend deployment dependency**

The API requires its notification tables and fulfillment audit fields to exist before this feature is enabled. Schema setup is managed separately; no migration or SQL script is included for these features. See the API project README under Staff notification inbox for persistence, background processing and PostgreSQL validation requirements.

**Feature files**

- src/layouts/TopBar.tsx
- src/layouts/NotificationBell.tsx
- src/layouts/TopBar.test.tsx
- src/layouts/NotificationBell.test.tsx
- src/api/notificationsApi.ts
- src/api/notificationsApi.test.ts
- src/api/notificationReadRequest.ts
- src/api/notificationReadRequest.test.ts
- src/api/apiClient.ts
- src/api/apiClient.notifications.test.ts
- src/features/delivery-calendar/DeliveryCalendarPage.tsx — navigation synchronization only.
- src/features/delivery-calendar/components/DateDetailsDrawer.tsx — service-day anchors/scrolling only.
- README.md

No Flutter, login/OTP, questionnaire, order-placement, meal-assignment, payment-processing, delivery-confirmation logic or Preparation Summary files were changed for this notification feature. Earlier work in this conversation remains in the working tree.

**Validation recorded for this implementation**

- React targeted runs: 19 distinct tests passed, covering header structure, count cap/zero state, read/retry actions, empty inbox, navigation, authorization-scoped caching, 45-second polling/cleanup, read-only screen receipts, API attribution and calendar/drawer regressions.
- React production build, TypeScript checks and targeted ESLint checks passed. The existing Vite large-chunk advisory remains.

## Daily fulfillment tracking

The existing monthly calendar and Scheduled Orders drawer share one service-day fulfillment model. Staff confirm home deliveries as DELIVERED and takeaway as COLLECTED. Approval, payment and whole-subscription status remain independent. No Finalize, Completed, Undo or separate delivery-management workflow was added.

The drawer provides Total Scheduled, Pending, Overdue and Fulfilled counters; All/Pending/Overdue/Delivered/Collected filters; overdue-first stable sorting; confirmation with customer, order, date and fulfillment mode; Qatar completion timestamps; optional staff names; and success feedback. Preparation Summary retains its meal quantities and PDF download. Its wording describes locked meal selections, and fulfillment actions appear only in Scheduled Orders.

**Backend definitions**

An eligible row is an actual subscription_service_days record linked to an order passing the existing approval/payment fulfillment policy, inside that order's purchased schedule, on a selected weekday other than Friday. Skipped, cancelled and unsupported historical service-day states are excluded. Existing PLANNED and CONFIRMED service-day codes are displayed as SCHEDULED. Missing service-day records are not fabricated or counted as fulfilled. The existing unique order/date and subscription/date indexes prevent duplicate service-day records.

The monthly endpoint batch-loads orders, service days, delivery slots and display names, then groups them in the existing data-access layer. There are no per-date or per-order database queries. Order and customer counts remain distinct counts; service-day totals count eligible service-day records.

Overdue is computed on each request using TimeProvider and Asia/Qatar. Home-delivery deadlines use the configured delivery slot's end time, falling back to a recorded order slot snapshot when available. Explicit overnight slots end on the following local date. A deadline must be strictly earlier than now. Future service dates and fulfilled days cannot be overdue. No collection-deadline configuration exists in the inspected takeaway schema, so takeaway has no invented deadline. OVERDUE is never persisted.

For every date: totalServiceDays = pendingCount + overdueCount + fulfilledCount; fulfilledCount = deliveredCount + collectedCount. Calendar priority is No Deliveries, Overdue, Fulfilled, Partially Fulfilled, then Scheduled. One overdue service day makes the date red. A date is green only when all eligible service days are fulfilled.

React Query invalidates the selected daily list, preparation data and calendar after a successful update. Mounted calendar/daily queries also refresh once a minute and on window focus. Background refresh preserves the selected month/date, active tab and status filter. Query observers clean up polling on unmount.

**API**

PATCH /api/admin/subscription-service-days/{serviceDayId}/fulfillment

The versioned /api/v1/admin/subscription-service-days/{serviceDayId}/fulfillment route is also supported. The existing Admin role can write; no additional delivery role is defined. Operations retains existing calendar/report read access but cannot confirm fulfillment. Anonymous users receive 401; customer tokens receive 403. Staff IDs must be valid authenticated GUIDs.

Example request:

```json
{ "status": "DELIVERED" }
```

For takeaway, send COLLECTED. Example response data:

```json
{
  "data": {
    "serviceDayId": "b55d27ec-5e95-4df0-aa20-77d9ca4f8b58",
    "status": "DELIVERED",
    "fulfilledAt": "2026-11-02T07:00:00+00:00",
    "fulfilledBy": "cf97699f-f067-4adf-b697-f47516cc68f0",
    "staffDisplayName": "Staff Member"
  },
  "meta": null,
  "errors": []
}
```

Names can be null. Order and service-day row locks serialize concurrent changes. Repeated identical requests preserve the original audit time, actor and revision. Conflicting transitions return 409; invalid delivery/collection modes return 400; missing service days return 404. Updates do not change other service days or meal selections.

The existing GET /api/v1/admin/orders/delivery-calendar?month=2026-11 response now adds orderCount, customerCount, totalServiceDays, pendingCount, overdueCount, deliveredCount, collectedCount, fulfilledCount and fulfillmentProgress per date. Existing response properties remain available. Rows add serviceDate, fulfillmentDeadline, isOverdue, fulfillment status and audit metadata.

**PostgreSQL and deployment**

No migration or standalone SQL script is included for this feature. Schema setup is managed separately. The API reuses subscription_service_days.status and requires nullable fulfilled_at/fulfilled_by audit fields and support for the COLLECTED status, as described by its model. Existing records must be preserved. No additional role or account assignment is required, and no live database changes were applied during this work.

Schema inspection used the repository's PostgreSQL dump, EF mappings, existing migrations, order slot snapshots and takeaway branch entity. No live database connection was available.

**Exact React Admin feature files**

Paths are relative to diet-time-admin-spa:

- src/api/deliveryCalendarApi.ts
- src/api/deliveryCalendarApi.test.ts
- src/features/delivery-calendar/types.ts
- src/features/delivery-calendar/fulfillment.ts
- src/features/delivery-calendar/fulfillment.test.ts
- src/features/delivery-calendar/DeliveryCalendarPage.tsx
- src/features/delivery-calendar/components/CalendarDayCell.tsx
- src/features/delivery-calendar/components/CalendarTracking.test.tsx
- src/features/delivery-calendar/components/TodayOrderPulse.tsx
- src/features/delivery-calendar/components/DateDetailsDrawer.tsx
- src/features/delivery-calendar/components/DateDetailsDrawer.test.tsx
- src/features/delivery-calendar/components/FulfillmentControl.tsx
- src/features/delivery-calendar/components/FulfillmentControl.test.tsx
- src/features/delivery-calendar/components/FulfillmentRefresh.test.tsx

**Exact ASP.NET Core feature files**

Paths are relative to diet-time-api; this list includes the retained fulfillment foundation from the preceding implementation:

- src/Apis/DietTime.Meal.Api/Controllers/AdminDeliveryCalendarController.cs
- src/Apis/DietTime.Meal.Api/Controllers/DeliveryPreparationController.cs
- src/Apis/DietTime.Meal.Api/Controllers/ServiceDayFulfillmentController.cs
- src/Apis/DietTime.Meal.Api/Program.cs
- src/BuildingBlocks/DietTime.Application/DailyFulfillmentTracking.cs
- src/BuildingBlocks/DietTime.Application/ServiceDayFulfillment.cs
- src/BuildingBlocks/DietTime.Contracts/AdminDeliveryCalendarContracts.cs
- src/BuildingBlocks/DietTime.Contracts/DeliveryPreparationContracts.cs
- src/BuildingBlocks/DietTime.Contracts/ServiceDayFulfillmentContracts.cs
- src/BuildingBlocks/DietTime.Domain/UpcomingMealEntities.cs
- src/BuildingBlocks/DietTime.Persistence/AdminDeliveryCalendarService.cs
- src/BuildingBlocks/DietTime.Persistence/ServiceDayFulfillmentService.cs
- src/BuildingBlocks/DietTime.Persistence/StaffOrderService.cs — retained existing Collected cancellation guard from the preceding implementation.
- src/BuildingBlocks/DietTime.Persistence/UpcomingMealService.cs — retained status mapping from the preceding implementation.
- tests/DietTime.UnitTests/ServiceDayFulfillmentTests.cs
- tests/DietTime.UnitTests/DailyFulfillmentTrackingTests.cs
- tests/DietTime.Meal.Api.IntegrationTests/ServiceDayFulfillmentApiTests.cs
- tests/DietTime.Meal.Api.IntegrationTests/DailyFulfillmentApiTests.cs

No Flutter files were edited for this extension. Earlier authorized Flutter status-mapping changes remain in the working tree.

**Validation**

- Backend targeted unit tests: 57 passed, covering deadlines, date boundaries, unknown collection windows, eligibility, transition/idempotency rules, count partitions, calendar priorities, preparation aggregation and PDF generation.
- API/contract test run: 13 passed, 3 skipped, including actual anonymous/customer HTTP rejection and five role-policy cases. Existing opt-in database tests require their environment flags.
- Additional PostgreSQL role/concurrency, aggregation and migration scenarios: 6 skipped because UPCOMING_MEALS_TEST_CONNECTION is unset. Persistence/concurrency behavior still needs execution against an isolated PostgreSQL instance.
- Frontend targeted suites: 35 distinct tests passed across the complete targeted run and final changed-file reruns. Coverage includes calendar visualization and selection, counters, filters/sorting, confirmation details, role gates, duplicate clicks, Qatar timestamp display, success feedback, calendar invalidation, filter/tab preservation, deadline polling and timer cleanup, and preparation/PDF regression behavior.
- React production build, TypeScript checks, API compilation and targeted ESLint checks passed. The Vite build retains its existing large-chunk advisory.

The remaining deployment requirement is ensuring the required schema exists and running the opt-in PostgreSQL scenarios before production rollout. There is no new collection deadline configuration or customer-facing delivery notification behavior in this change.

Export scope follow-up validation: 6 targeted frontend tests, 7 CSV unit tests, 2 API integration tests (including real PostgreSQL resource isolation and selected-template checks) and 2 desktop/mobile Chromium tests passed. CSV parsing verifies exactly English/Arabic columns even with multiline content. TypeScript, targeted ESLint and production build passed. The synthetic sample CSV was regenerated in artifacts/master-data-translations-sample.csv. Deploy API and SPA together; the endpoint now requires the screen resource.
