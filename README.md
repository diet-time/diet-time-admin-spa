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
- `VITE_UPLOAD_MAX_MB` — browser upload limit, default 15; backend remains authoritative

## API and authentication

All data flows through the Diet Time API; the browser never connects to PostgreSQL. Axios sends credentials for an HttpOnly refresh cookie, keeps short-lived access tokens in memory, restores the session through `/auth/refresh`, retries once after a 401, and handles 403 globally. Authentication uses `/auth/login`, `/auth/refresh`, `/auth/logout`, and `/auth/me`. No authentication token or session flag is stored in `localStorage`.

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

Create a Railway service from this repository using the Dockerfile. Set build argument `VITE_API_BASE_URL` to the production API root and expose port 80. Add `admin.diettime.com` as the custom domain and configure its DNS using Railway’s target. Verify `/health`, then add the final origin to ASP.NET CORS and refresh-cookie settings. Vite variables are compiled at build time, so rebuild after changing them.

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
