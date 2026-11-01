# Dashboard Sales (Orders and Deliveries) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Orders and Deliveries screens in the dashboard so the owner can take a storefront order from pending to completed (or cancelled), plus three small read-side API additions they need.

**Architecture:** Task 1 is in the API repo (`../commerce-erp-api`, branch `feature/sales-support`). Tasks 2–11 are in this repo (branch `feature/sales`) and follow the Products slice's patterns exactly: self-contained query/mutation hook files, store-scoped keys, URL-held list filters, pages in `src/pages/sales/`, feature components in `src/components/sales/`, MSW feature tests in `src/tests/features/Orders/` and `src/tests/features/Deliveries/`.

**Tech Stack:** React 19, TypeScript 5.9, React Router 6, TanStack Query 5, RHF + Zod, Tailwind on design tokens, Vitest + Testing Library + MSW; Laravel + Pest + Pint.

**Spec:** `docs/superpowers/specs/2026-11-01-dashboard-sales-design.md` (read it; every copy string in it is binding).
**Design reference:** `.superpowers/design-ref/screens/Orders.jsx`, `OrderDetail.jsx`, `Deliveries.jsx`, `.superpowers/design-ref/sales-components.md`, `components.css`.
**API contract:** `.superpowers/design-ref/sales-api-contract.md`.

## Global Constraints

- Follow `CLAUDE.md`: full words in identifiers, import order, `@/` alias, no barrel files, no mocked routing primitives or data hooks, MSW only.
- Store id from `useAuthedSession().store.id`, URLs via `storePath(storeId, path)`, keys in `queryKeys` starting `['stores', storeId, …]`.
- Routes `/orders`, `/orders/:orderId`, `/deliveries`, `/deliveries/:deliveryId` under `RequirePermission slug="orders.view" message="You don't have access to orders."`.
- Actions only with `hasPermission('orders.manage')`; without it the screens are read-only.
- Times: `formatMovementTime` for relative-or-absolute, `formatDateTime` (Task 2) for absolute; locale `en-KE`.
- Money: `formatMoney` / `formatAmount`; fee input validated with `isValidPrice`, sent via `toMoneyInput`.
- Orders list, its tab counts and the sidebar pending count: `refetchInterval: 60_000`, `refetchOnWindowFocus: true`. Order and delivery detail: `refetchOnWindowFocus: true`.
- No email is promised in any copy. API 409/422 messages are shown as-is.
- Commit after each task with a conventional message ending in the attribution line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Fee still pending when dispatching — Dispatch dialog shows "Set the delivery fee before dispatch." and its Dispatch button is disabled (Task 8 test).
2. Dispatch's second call fails after the delivery was created — the dialog shows the error, the order shows the delivery, and trying again calls only `/dispatch` (no second `POST /delivery`) (Task 8 test).
3. Confirming after the stock hold expired — the 409 message "This order's stock hold has expired." shows as an error toast and the order is refetched (Task 7 test).
4. A Staff user (no `orders.manage`) — no action buttons on either detail screen, no fee button, no Add note, no Edit (Task 7 and Task 11 tests).
5. Pickup deliveries and no active couriers — pickup shows "Collected" / "Not collected" and no "Mark in transit"; with no active courier the Courier radio is disabled with the hint (Task 8 and Task 11 tests).

---

### Task 1: API read additions (commerce-erp-api)

**Repo:** `/Users/jamesapollo/projects/erp/commerce-erp-api`. Create branch `feature/sales-support` from `main`.

**Files:**
- Modify: `app/Modules/Orders/Http/Resources/OrderListItemResource.php`, `app/Modules/Orders/Http/Resources/OrderResource.php`, `app/Modules/Fulfilment/Data/DeliveryTimelineEntry.php` (and whatever loads its events: `app/Modules/Fulfilment/Queries/Deliveries.php`), `docs/api/openapi.yaml`
- Test: existing Pest feature tests under `tests/Feature/Orders/` and `tests/Feature/Fulfilment/` (add cases there)

**Interfaces — Produces (JSON):**
- Order list item: `buyer_phone: string`, `zone_name: string|null` (the `delivery_zone_name` snapshot).
- Delivery timeline event (in `GET /deliveries/{id}` `timeline[]` and in the order's `delivery.timeline[]`): `actor: { id: int, name: string } | null`, keeping `actor_user_id`.
- Order detail: `cancelled_by: { id: int, name: string } | null` from `cancelled_by_user_id`.
- Resolve names the way `ListStockMovements` / `StockMovementResource` do (`actor_name` selected alongside the row); respect module boundaries the same way that code does.

- [ ] **Step 1:** Write failing Pest tests: the order list item has `buyer_phone` and `zone_name` (null for a pending-quote order); a delivery's timeline events carry `actor.name` of the acting user, on both `GET /deliveries/{id}` and `GET /orders/{id}`; `cancelled_by` is `{id, name}` after a staff cancel and `null` after the hold-expiry cancel (`cancel_reason` `not_confirmed`). Use the existing test helpers in those folders.
- [ ] **Step 2:** Run `php artisan test --filter=<new tests>`; expect FAIL on the missing keys.
- [ ] **Step 3:** Implement. No N+1: names come from one query per list/timeline.
- [ ] **Step 4:** Update `docs/api/openapi.yaml` for the three shapes (`OpenApiContractTest` asserts responses against it).
- [ ] **Step 5:** Run `php artisan test` (full suite, expect all pass) and `vendor/bin/pint --test` (clean).
- [ ] **Step 6:** Commit `feat(orders): buyer phone and zone on list, actor names on delivery timeline and cancel`.

---

### Task 2: Sales types, fixtures, endpoints, keys and rules

Branch `feature/sales` from dashboard `main` (this task creates it).

**Files:**
- Create: `src/types/sales.ts`, `src/tests/fixtures/sales.ts`, `src/utils/salesRules.ts`, `src/utils/salesRules.spec.ts`, `src/utils/country.ts`, `src/utils/country.spec.ts`
- Modify: `src/hooks/api/queryKeys.ts`, `src/tests/mocks/endpoints.ts`, `src/tests/fixtures/user.ts` (add `orders.view`, `orders.manage` to the default permissions), `src/utils/apiErrors.ts` (+ spec), `src/utils/movementTime.ts` (+ spec)

**Interfaces — Produces:**
- `src/types/sales.ts` (field names exactly as the API JSON in the contract, plus Task 1's additions):
  `OrderStatus = 'pending'|'confirmed'|'dispatched'|'completed'|'cancelled'`; `DeliveryStatus = 'preparing'|'dispatched'|'in_transit'|'delivered'|'failed'|'returned'|'cancelled'`; `DeliveryMethod = 'courier'|'pickup'`; `Actor = { id: number; name: string }`;
  `OrderListItem { id, reference, status, buyer_name, buyer_phone, country, zone_name: string|null, item_count, grand_total: Money|null, delivery_fee_pending: boolean, created_at, hold_expires_at: string|null, delivery_status: DeliveryStatus|null }`;
  `OrderLine { id, product_variant_id, product_name, variant_label, sku, quantity, unit_price, unit_discount, unit_price_paid, line_total }` (Money fields);
  `DeliveryTimelineEvent { id, type: 'status_changed'|'note', from_status: DeliveryStatus|null, to_status: DeliveryStatus|null, note: string|null, actor_user_id: number|null, actor: Actor|null, created_at }`;
  `OrderDelivery { id, method, status, status_label, courier_name, tracking_number, tracking_url, dispatched_at, delivered_at, failure_reason, timeline: DeliveryTimelineEvent[] }`;
  `Order = OrderListItem & { lines, buyer_email: string|null, address: { line1, line2, city, region, postal_code }, delivery_charge: { zone_name, fee: Money|null, source: 'zone'|'quote'|null, pending_quote: boolean }, subtotal, discount_total, tax_total, confirmed_at, dispatched_at, completed_at, cancelled_at, cancel_reason, cancelled_by: Actor|null, updated_at, delivery: OrderDelivery|null }`;
  `DeliveryListItem { id, order_id, order_reference, method, courier_name, tracking_number, status, status_label, dispatched_at, updated_at }`;
  `Delivery = DeliveryListItem & { courier_id: number|null, tracking_url, failure_reason, delivered_at, failed_at, returned_at, cancelled_at, created_at, timeline: DeliveryTimelineEvent[] }`;
  `Courier { id, name, phone: string|null, tracking_url_template: string|null, is_active: boolean, created_at, updated_at }`.
  Reuse `Money` and `Paginated<T>` from `@/types/catalogue`.
- Fixtures: `buildOrderListItemFixture`, `buildOrderFixture`, `buildOrderLineFixture`, `buildOrderDeliveryFixture`, `buildDeliveryListItemFixture`, `buildDeliveryFixture`, `buildDeliveryEventFixture`, `buildCourierFixture`, each `(overrides: Partial<T> = {}) => T` with realistic KES values (reference like `ZN7K-Q4M2-X9TD`, phone `+254712345678`).
- `mockEndpoints`: `orders`, `order`, `orderConfirm`, `orderDelivery`, `orderDispatch`, `orderComplete`, `orderCancel`, `orderDeliveryFee`, `deliveries`, `delivery`, `deliveryInTransit`, `deliveryDelivered`, `deliveryFailed`, `deliveryRetry`, `deliveryReturned`, `deliveryNotes`, `deliveryTracking`, `couriers` (paths per the contract, params `:orderId`, `:deliveryId`).
- `queryKeys`: `orders(storeId)` = `['stores', storeId, 'orders']`; `orderList(storeId, filters: OrderListFilters)` = `[...orders, 'list', filters]`; `order(storeId, orderId)` = `[...orders, 'detail', orderId]`; `deliveries(storeId)`; `deliveryList(storeId, filters: DeliveryListFilters)`; `delivery(storeId, deliveryId)`; `couriers(storeId)`. Types `OrderListFilters = { status?: OrderStatus; search?: string; feePending?: boolean; page?: number; perPage?: number }`, `DeliveryListFilters = { status?: DeliveryStatus; search?: string; courierId?: number; page?: number; perPage?: number }` exported from `queryKeys.ts` like `ProductListFilters`.
- `salesRules.ts`:
  - `getOrderActions(order: Order, canManage: boolean): { canConfirm; canCancel; canDispatch; canComplete; isCompleteReady; canSetFee }` — all false without `canManage`; pending → confirm, cancel, setFee; confirmed → dispatch, cancel, setFee; dispatched → complete (shown) with `isCompleteReady = delivery?.status === 'delivered'`, cancel only when delivery status is `failed` or `returned`; final → none.
  - `getDeliveryActions(delivery: { status; method }, canManage: boolean): { canMarkInTransit; canMarkDelivered; canMarkFailed; canRetry; canMarkReturned; canEditTracking; canAddNote }` — per the contract's delivery table: in-transit only `dispatched` + courier; delivered/failed from `dispatched`/`in_transit`; retry/returned from `failed`; edit tracking in `preparing`/`failed` and courier method only; note unless `delivered`/`returned`/`cancelled`.
  - `isHoldEndingSoon(holdExpiresAt: string|null, now?: Date): boolean` — true when within 6 hours (and not past).
- `formatDateTime(iso: string): string` in `movementTime.ts` — the existing en-KE formatter (`18 Oct, 11:30`).
- `formatCountry(code: string): string` in `country.ts` — `Intl.DisplayNames(['en'], { type: 'region' })`, falling back to the code.
- `getActionErrorMessage` returns the API `message` for a 409.

- [ ] **Step 1:** Write failing specs: `salesRules.spec.ts` covering every status × method row above and the no-permission case; `isHoldEndingSoon` at 5 h (true), 7 h (false), past (false), null (false); `formatCountry('KE')` → `'Kenya'`, `formatCountry('ZZ')` → `'ZZ'`; `formatDateTime`; `getActionErrorMessage` on a 409 `{ message: "This order's stock hold has expired.", code: 'hold_expired' }` returns that message.
- [ ] **Step 2:** `npx vitest run src/utils` — expect FAIL.
- [ ] **Step 3:** Implement everything in this task's Files list.
- [ ] **Step 4:** `npx vitest run src/utils` PASS; `npm run typecheck` and `npm run lint` clean; `npm test` still all green.
- [ ] **Step 5:** Commit `feat(sales): types, fixtures, query keys and status rules`.

---

### Task 3: Timeline, LifecycleStepper and Radio primitives

**Files:**
- Create: `src/components/ui/Timeline.tsx`, `src/components/ui/LifecycleStepper.tsx`, `src/components/ui/Radio.tsx` and a `.spec.tsx` beside each

**Interfaces — Produces:**
- `TimelineItem = { id: string; title: string; time?: string; meta?: string; note?: string; tone?: 'filled'|'success'|'danger'|'warning'|'info'; icon?: LucideIcon }`; `Timeline({ items }: { items: TimelineItem[] })` renders an `<ol>`.
- `LifecycleStepper({ steps, current, cancelled = false }: { steps: { label: string; time?: string }[]; current: number; cancelled?: boolean })`; each step exposes its state for tests via `data-state="done"|"current"|"todo"`, and the done check icon is hidden when `cancelled`.
- `Radio` — `forwardRef<HTMLInputElement>` with `label`, `description?`, native input props, `displayName = 'Radio'`; binds with `register`.
- Look: map the CSS in `.superpowers/design-ref/sales-components.md` to Tailwind tokens, as the existing primitives do.

- [ ] **Step 1:** Failing specs: Timeline renders titles, times, meta and notes in order; LifecycleStepper with `current=1` gives states done/current/todo/todo, with `cancelled` the reached steps are `done` and show no check; Radio is checkable by label and forwards its ref.
- [ ] **Step 2:** Run them, expect FAIL. **Step 3:** Implement. **Step 4:** PASS + typecheck + lint.
- [ ] **Step 5:** Update the primitives table in `CLAUDE.md` §2 with the three. Commit `feat(ui): timeline, lifecycle stepper and radio`.

---

### Task 4: Sales query hooks and list filters

**Files:**
- Create: `src/hooks/api/queries/sales/useOrdersQuery.ts`, `useOrderStatusCountsQuery.ts`, `usePendingOrderCountQuery.ts`, `useOrderQuery.ts`, `useDeliveriesQuery.ts`, `useDeliveryQuery.ts`, `useCouriersQuery.ts`; `src/hooks/useOrderListFilters.ts`, `src/hooks/useDeliveryListFilters.ts` (+ a spec for each filters hook)

**Interfaces — Produces:**
- `ORDERS_PER_PAGE = 25`, `getOrders(storeId, filters)` (params `status`, `q` = search, `delivery_fee: 'pending'` when `feePending`, `page`, `per_page`), `ordersQueryOptions(storeId, filters)`, `useOrdersQuery(filters)` (keepPreviousData, 60 s interval, focus refetch).
- `useOrderStatusCountsQuery({ search, feePending })` → `{ counts: Record<'all'|OrderStatus, number|undefined> }` (one `perPage: 1` query per tab, same interval).
- `usePendingOrderCountQuery({ enabled }: { enabled: boolean })` → `number | undefined`.
- `orderQueryOptions(storeId, orderId)`, `useOrderQuery(orderId)` (enabled for positive integers, focus refetch); same pair for deliveries (`getDeliveries` params `status`, `courier_id`, `q`, `page`, `per_page`; `DELIVERIES_PER_PAGE = 25`) and `useDeliveryQuery(deliveryId)`.
- `useCouriersQuery()` → `Courier[]` (unwraps `{ data }`).
- `useOrderListFilters()` — like `useProductListFilters`: URL params `status`, `q`, `fee=pending`, `page`; returns `{ filters, searchText, setStatus, setSearch, setFeePending(isOn), setPage }`.
- `useDeliveryListFilters()` — params `status`, `q`, `courier`, `page`; returns `{ filters, searchText, setStatus, setSearch, setCourierId, clear, setPage }`.

- [ ] **Step 1:** Failing filter-hook specs (render inside `customRenderAtRoute`-style router, assert `router.state.location.search`): an invalid status is ignored; typing reaches `q` after 300 ms and drops `page`; `setFeePending(true)` sets `fee=pending`; `clear()` drops `q` and `courier`.
- [ ] **Step 2–4:** FAIL, implement all files, PASS + typecheck + lint.
- [ ] **Step 5:** Commit `feat(sales): order, delivery and courier queries and list filters`.

---

### Task 5: Orders list, routes and the Sales sidebar group

**Files:**
- Create: `src/pages/sales/OrdersPage.tsx`, `src/components/sales/OrdersTable.tsx`, `src/tests/features/Orders/OrdersList.spec.tsx`
- Modify: `src/constants/routes.ts` (`ORDERS: '/orders'`, `ORDER_DETAIL: '/orders/:orderId'`, `DELIVERIES: '/deliveries'`, `DELIVERY_DETAIL: '/deliveries/:deliveryId'`, `buildOrderPath(id)`, `buildDeliveryPath(id)`), `src/Router.tsx` (the `orders.view` gate with `ORDERS` now; later tasks add the other three routes inside it), `src/components/layout/Sidebar.tsx`, `src/tests/features/Navigation/*` if they assert the nav
- Move: `src/components/products/Pagination.tsx` → `src/components/ui/Pagination.tsx` (update imports)

**Interfaces — Consumes:** Task 2 types/fixtures/rules, Task 3 none, Task 4 `useOrdersQuery`, `useOrderStatusCountsQuery`, `usePendingOrderCountQuery`, `useOrderListFilters`.

Behaviour and copy: spec "Orders list" and "Routes and navigation". Crumbs `['Sales', 'Orders']`. Header title "Orders", sub "Storefront orders. Payment and delivery are arranged with the buyer."

- [ ] **Step 1:** Failing feature tests (MSW):
  - shows rows with buyer name (link to `/orders/{id}`), phone, zone, "Quote" badge for a fee-pending order, order and delivery badges, total `4,500.00`;
  - tab counts from `meta.total` (e.g. "Pending 3");
  - clicking Pending sends `status=pending`; typing `0712` sends `q=0712`; the "Fee pending" chip sends `delivery_fee=pending` and is `aria-pressed`;
  - a pending order whose hold ends in 2 h shows "Hold ends {formatDateTime}";
  - empty All tab copy "No orders yet. They'll appear here when buyers check out."; filtered empty "No orders in this view.";
  - `?page=9` beyond the last page redirects to the last page;
  - a user without `orders.view` sees "You don't have access to orders." and no Sales group in the sidebar;
  - the sidebar shows Sales → Orders with the pending count `3` and Deliveries.
- [ ] **Step 2–4:** FAIL, implement, PASS + typecheck + lint + `npm test`.
- [ ] **Step 5:** Commit `feat(sales): orders list and sales navigation`.

---

### Task 6: Order detail (read-only)

**Files:**
- Create: `src/pages/sales/OrderDetailRoute.tsx`, `src/pages/sales/OrderDetailPage.tsx`, `src/components/sales/OrderStatusCard.tsx`, `OrderItemsCard.tsx`, `OrderActivityCard.tsx`, `BuyerCard.tsx`, `OrderDeliveryCard.tsx`, `PaymentCard.tsx`; `src/utils/deliveryTimeline.ts` (+ spec), `src/utils/orderActivity.ts` (+ spec); `src/tests/features/Orders/OrderDetail.spec.tsx`
- Modify: `src/Router.tsx` (ORDER_DETAIL, handle `{ crumbs: ['Sales', 'Orders'], trailingCrumb: 'orderReference' }`), `src/types/routeHandle.ts` (`trailingCrumb?: 'productName' | 'orderReference' | 'deliveryReference'`), `src/components/layout/Topbar.tsx` (order reference crumb; invalid id → "Page not found", as products)

**Interfaces — Produces:**
- `toDeliveryTimelineItems(events: DeliveryTimelineEvent[], method: DeliveryMethod, courierName: string|null, trackingNumber: string|null): TimelineItem[]` — the title/tone/icon/meta table in the spec's "Delivery detail" section; meta "by {actor.name}" when `actor` is set.
- `buildOrderActivity(order: Order): TimelineItem[]` — the spec's "Activity card" list, merged with `toDeliveryTimelineItems(order.delivery…)`, sorted newest first by timestamp.
- `OrderDetailRoute` renders `NotFoundPage` for a non-digit `:orderId`; a 404 from the API also renders `NotFoundPage`.

Behaviour and copy: spec "Order detail" (all read-only parts; the header actions area is empty in this task).

- [ ] **Step 1:** Failing tests: `deliveryTimeline.spec.ts` (each mapping row including pickup labels, retry title, omitted actor); `orderActivity.spec.ts` (ordering; automatic cancel title "Cancelled automatically" and its note; staff cancel meta "by Amina H." with the reason as note); feature test: header "Order ZN7K-Q4M2-X9TD", stepper states for a confirmed order, items rows and footer (Subtotal, Offer savings only when non-zero, "Delivery · Nairobi CBD", Total; pending quote shows "Pending quote" and "Total so far"), buyer card with `tel:` link and "Kenya", delivery card empty copy "No delivery yet. It's created when you dispatch the order.", payment "Unpaid" for pending; `/orders/abc` shows Page not found in page and crumb; crumb shows the reference.
- [ ] **Step 2–4:** FAIL, implement, PASS + typecheck + lint.
- [ ] **Step 5:** Commit `feat(sales): order detail`.

---

### Task 7: Order actions — confirm, fee, cancel, complete

**Files:**
- Create: `src/hooks/api/mutations/sales/useConfirmOrderMutation.ts`, `useSetDeliveryFeeMutation.ts`, `useCancelOrderMutation.ts`, `useCompleteOrderMutation.ts`; `src/components/sales/OrderHeaderActions.tsx`, `DeliveryFeeDialog.tsx`, `CancelOrderDialog.tsx`, `cancelOrderSchema.ts`, `deliveryFeeSchema.ts`; `src/tests/features/Orders/OrderActions.spec.tsx`
- Modify: `OrderDetailPage.tsx`, `OrderItemsCard.tsx` (fee button)

**Interfaces — Produces:**
- `storeOrderResponse(queryClient, storeId, order: Order): void` exported from `useConfirmOrderMutation.ts`: writes `queryKeys.order`, invalidates `[...queryKeys.orders(storeId), 'list']` and `queryKeys.deliveries(storeId)`.
- `useConfirmOrderMutation(orderId)`, `useCompleteOrderMutation(orderId)` — no body. `useCancelOrderMutation(orderId)` — `{ reason }`. `useSetDeliveryFeeMutation(orderId)` — `{ amount }` as `toMoneyInput`. Confirm and cancel also invalidate `queryKeys.products(storeId)` and `['stores', storeId, 'stock-movements']`. On a 409 each invalidates `queryKeys.order(storeId, orderId)`.

Behaviour and copy: spec "Order detail" actions, fee dialog, cancel dialog, confirm and complete; "Errors and permissions".

- [ ] **Step 1:** Failing feature tests:
  - pending: "Confirm order" posts confirm, shows toast "Order confirmed", status becomes Confirmed;
  - confirm 409 `hold_expired` shows "This order's stock hold has expired." and refetches the order;
  - fee: "Set fee" opens "Set delivery fee"; `abc` shows "Enter a fee — 0 for free"; `350` sends `{ amount: '350.00' }`, toast "Delivery fee set";
  - cancel: "Cancel order" disabled-or-error with an empty reason (the schema requires 1–255), sends `{ reason }`, toast "Order cancelled";
  - dispatched with delivery `in_transit`: "Mark completed" disabled; with `delivered`: enabled, posts complete, toast "Order completed";
  - dispatched with delivery `failed`: Cancel is offered; with `in_transit`: not offered;
  - a user without `orders.manage` sees no action buttons and no fee button.
- [ ] **Step 2–4:** FAIL, implement, PASS + typecheck + lint.
- [ ] **Step 5:** Commit `feat(sales): confirm, cancel, complete and delivery fee`.

---

### Task 8: Dispatch dialog

**Files:**
- Create: `src/hooks/api/mutations/sales/useCreateOrderDeliveryMutation.ts`, `useDispatchOrderMutation.ts`, `useUpdateDeliveryTrackingMutation.ts`; `src/components/sales/DispatchOrderDialog.tsx`, `dispatchOrderSchema.ts`; `src/tests/features/Orders/DispatchOrder.spec.tsx`
- Modify: `OrderHeaderActions.tsx`

**Interfaces — Produces:**
- `useCreateOrderDeliveryMutation(orderId)` — `{ method, courier_id?, tracking_number? }` → `Order` via `storeOrderResponse`.
- `useDispatchOrderMutation(orderId)` → `Order` via `storeOrderResponse`.
- `storeDeliveryResponse(queryClient, storeId, delivery: Delivery): void` exported from `useUpdateDeliveryTrackingMutation.ts`: writes `queryKeys.delivery`, invalidates the deliveries list, `queryKeys.order(storeId, delivery.order_id)` and the orders list.
- `useUpdateDeliveryTrackingMutation(deliveryId)` — PATCH `{ courier_id, tracking_number }` → `Delivery`.

Behaviour and copy: spec "Dispatch dialog". Courier options: `useCouriersQuery()` filtered to `is_active`. Sequence on submit: no delivery → create, then dispatch; existing `preparing` delivery with changed courier/number → PATCH tracking, then dispatch; otherwise dispatch. Keep the dialog open with the error (via `getActionErrorMessage`) if any call fails.

- [ ] **Step 1:** Failing feature tests:
  - courier dispatch sends `POST /delivery { method: 'courier', courier_id: 2, tracking_number: 'KE88213' }` then `POST /dispatch`; toast "Order dispatched"; delivery card shows the courier;
  - pickup hides the courier select and sends `{ method: 'pickup' }`;
  - no active couriers: the Courier radio is disabled and the hint "No active couriers. Choose pickup, or ask an owner to add a courier." shows;
  - fee pending: the alert "Set the delivery fee before dispatch." shows and Dispatch is disabled;
  - `/dispatch` fails with 422 `{ errors: { courier_id: ['Choose an active courier.'] } }` after the delivery was created: the message shows in the dialog; trying again calls `/dispatch` without another `POST /delivery`;
  - existing delivery: method shows as text, not radios.
- [ ] **Step 2–4:** FAIL, implement, PASS + typecheck + lint.
- [ ] **Step 5:** Commit `feat(sales): dispatch an order by courier or pickup`.

---

### Task 9: Deliveries list

**Files:**
- Create: `src/pages/sales/DeliveriesPage.tsx`, `src/components/sales/DeliveriesTable.tsx`, `src/tests/features/Deliveries/DeliveriesList.spec.tsx`
- Modify: `src/Router.tsx` (DELIVERIES, crumbs `['Sales', 'Deliveries']`)

Behaviour and copy: spec "Deliveries list"; header title "Deliveries", sub "One per dispatched order. Deliveries are created from the order page and never deleted."

- [ ] **Step 1:** Failing feature tests: rows show the order reference as a link to `/deliveries/{id}`, "Pickup" badge vs Courier, courier, tracking, `status_label`, dispatched time or "—"; the In transit tab sends `status=in_transit`; the courier select sends `courier_id=2`; searching sends `q`; "Clear" resets both; empty copy while searching "No delivery matches that reference or tracking number.", otherwise "No deliveries in this view."
- [ ] **Step 2–4:** FAIL, implement, PASS + typecheck + lint.
- [ ] **Step 5:** Commit `feat(sales): deliveries list`.

---

### Task 10: Delivery detail (read-only)

**Files:**
- Create: `src/pages/sales/DeliveryDetailRoute.tsx`, `DeliveryDetailPage.tsx`, `src/components/sales/DeliveryTimelineCard.tsx`, `DeliveryStatusCard.tsx`, `DeliveryTrackingCard.tsx`, `DeliveryOrderCard.tsx`; `src/tests/features/Deliveries/DeliveryDetail.spec.tsx`
- Modify: `src/Router.tsx` (DELIVERY_DETAIL, `trailingCrumb: 'deliveryReference'`), `Topbar.tsx`

**Interfaces — Consumes:** `toDeliveryTimelineItems` (Task 6), `useDeliveryQuery`, `useOrderQuery(delivery.order_id)`.

Behaviour and copy: spec "Delivery detail" except actions, dialogs and the complete-order card.

- [ ] **Step 1:** Failing tests: header "Delivery {order reference}", sub "Courier · last update …"; failed banner text with the reason; preparing banner with "Go to order" linking to the order; timeline titles with "by Otieno O."; tracking card with "Open tracking page" link to `tracking_url`; pickup hides the tracking card; order card shows buyer and zone from the order and "Open" links to it; `/deliveries/abc` → Page not found; crumb shows the order reference.
- [ ] **Step 2–4:** FAIL, implement, PASS + typecheck + lint.
- [ ] **Step 5:** Commit `feat(sales): delivery detail`.

---

### Task 11: Delivery actions, then docs

**Files:**
- Create: `src/hooks/api/mutations/sales/useMarkDeliveryInTransitMutation.ts`, `useMarkDeliveryDeliveredMutation.ts`, `useMarkDeliveryFailedMutation.ts`, `useRetryDeliveryMutation.ts`, `useMarkDeliveryReturnedMutation.ts`, `useAddDeliveryNoteMutation.ts`; `src/components/sales/DeliveryHeaderActions.tsx`, `MarkDeliveryFailedDialog.tsx`, `MarkDeliveryReturnedDialog.tsx`, `DeliveryTrackingDialog.tsx` (Edit tracking and Retry modes), `AddDeliveryNoteDialog.tsx`, `CompleteOrderCard.tsx`; `src/tests/features/Deliveries/DeliveryActions.spec.tsx`
- Modify: `DeliveryDetailPage.tsx`, `DeliveryTrackingCard.tsx` (Edit), `DeliveryTimelineCard.tsx` (Add note), `CLAUDE.md` (layout, hooks tree, routes, permissions for sales), `README.md` (screens list)

**Interfaces — Consumes:** `getDeliveryActions`, `storeDeliveryResponse`, `useUpdateDeliveryTrackingMutation`, `useCompleteOrderMutation`, `useCouriersQuery`.

Behaviour and copy: spec "Delivery detail" actions and dialogs, design toasts ("Marked in transit", "Marked delivered" / "Marked collected", "Marked failed", "Delivery retried", "Marked returned", "Tracking updated", "Note added"; description = order reference). Retry sends only changed fields.

- [ ] **Step 1:** Failing feature tests:
  - courier `dispatched`: "Mark in transit", "Mark failed", "Mark delivered"; pickup `dispatched`: no "Mark in transit", buttons "Not collected" and "Mark collected";
  - failed dialog requires a reason, sends `{ reason }`, toast "Marked failed";
  - failed: "Retry delivery" opens the dialog prefilled with the current courier; "Retry" posts retry, toast "Delivery retried"; "Mark returned" confirms and posts, toast "Marked returned";
  - Add note sends `{ note }`, toast "Note added"; hidden when delivered;
  - Edit tracking only in `preparing`/`failed`; PATCH with an emptied tracking number sends `tracking_number: null`;
  - delivered delivery whose order is `dispatched`: the card "Delivered. Complete the order to close the sale." and "Complete order" posts `/orders/{id}/complete`;
  - a user without `orders.manage`: no actions, no Add note, no Edit, no Complete order.
- [ ] **Step 2–4:** FAIL, implement, PASS.
- [ ] **Step 5:** Update `CLAUDE.md` and `README.md`. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` — all clean.
- [ ] **Step 6:** Commit `feat(sales): delivery actions` and `docs: sales module`.
