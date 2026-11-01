# Dashboard sales (Orders and Deliveries) — design

Date: 2026-11-01
Repos: `erp-dashboard` (this repo) and `commerce-erp-api` (`../commerce-erp-api`)

## Intent

Buyers find a product on the storefront, add it to the cart and place an order. The owner then gets the order and
tries to fulfil it. This slice gives the owner the screens to do that end to end: see new orders, confirm them,
agree a delivery fee when the buyer's area has none, hand the parcel to a courier or set it aside for pickup, follow
the delivery until it arrives (or fails and is retried or returned), and close the order. It also lays the data
groundwork for the Overview dashboard, which is built next.

The user asked to skip the questions and work from the design and the API. Screens come from the Commerce ERP design
system (DesignSync project `45d60803-0b17-44d5-abe4-afe6f29b1d79`): `ui_kits/admin/Orders.jsx`, `OrderDetail.jsx`,
`Deliveries.jsx` (list and detail), `Shell.jsx`, and the `Timeline`, `LifecycleStepper`, `Radio` and `StatusBadge`
components. Copies live in `.superpowers/design-ref/` (`screens/Orders.jsx`, `screens/OrderDetail.jsx`,
`screens/Deliveries.jsx`, `sales-components.md`). Behaviour comes from the API's Orders and Fulfilment modules,
summarised in `.superpowers/design-ref/sales-api-contract.md` (the code is the truth where docs disagree). Where
design and API disagree, the API wins and the design is adjusted as listed below.

## Goals

- Orders list: status tabs with counts (All, Pending, Confirmed, Dispatched, Completed, Cancelled), search by
  reference or phone, a "Fee pending" filter, paging, and a row per order showing placed time, buyer, zone, order
  status, delivery status and total.
- Order detail: status and lifecycle stepper, items with totals, activity timeline, buyer, delivery and payment
  cards; actions Confirm order, Set/Change delivery fee, Dispatch (courier or pickup), Mark completed and Cancel.
- Deliveries list: status tabs, search by order reference or tracking number, courier filter, paging.
- Delivery detail: timeline with actor names, status, tracking and order cards; actions Mark in transit, Mark
  delivered / collected, Mark failed / Not collected, Retry delivery, Mark returned, Edit tracking, Add note, and
  Complete order once the delivery is delivered.
- Sidebar "Sales → Orders, Deliveries" with the pending-orders count on Orders; breadcrumbs per route.
- Controls respect `orders.view` and `orders.manage`.

## Non-goals

- Couriers and delivery zones management (the "Store" group). They belong to the Settings module. The dispatch
  dialog reads the courier list; with no active courier only Pickup can be chosen.
- Export, bulk selection, packing slips (no API).
- Zone and date-placed filters on orders, sorting (no API).
- Payments (the API has no payment concept; the Payment card shows the design's offline-payment note only).
- Staff-created orders, editing lines/address, order notes (no API).
- The Overview dashboard (next slice; parked notes in `.superpowers/brainstorm/overview-notes.md`).

## Anti-goals

- Showing something the API didn't say. Anything we can't know (who confirmed an order, whether the buyer paid) is
  left out rather than invented. Copy never promises an email the API doesn't send.
- A button that always fails. Actions are shown only in the states the API allows (the transition tables in the
  contract) and only to users with `orders.manage`; when the API still refuses (a race, an expired hold), its 409
  message is shown as-is.
- Losing a half-done dispatch. Dispatch is two API calls (create the delivery, then dispatch). If the second fails,
  the order page already shows the delivery, and trying again dispatches the existing one.

## API additions (commerce-erp-api, branch `feature/sales-support`)

Small read-side additions, each with Pest tests and `docs/api/openapi.yaml` updated:

1. `OrderListItemResource` gains `buyer_phone` (string) and `zone_name` (string|null, the order's snapshot zone
   name), for the list's Buyer and Zone columns.
2. Delivery timeline events (in `DeliveryResource` and the order's embedded `delivery.timeline`) gain
   `actor: { id, name } | null`, the same shape stock movements already use (`StockMovementResource`). Null when
   there was no actor.
3. `OrderResource` gains `cancelled_by: { id, name } | null`, from `cancelled_by_user_id`. Null for automatic
   cancellations.

No counts endpoint is added: tab counts use `per_page=1` list calls reading `meta.total`, as Products does.

## Routes and navigation

- `/orders`, `/orders/:orderId`, `/deliveries`, `/deliveries/:deliveryId`, all under
  `RequirePermission slug="orders.view" message="You don't have access to orders."`. Non-digit ids render
  NotFoundPage (as products do).
- Crumbs: `['Sales', 'Orders']`, `['Sales', 'Orders', <reference>]`, `['Sales', 'Deliveries']`,
  `['Sales', 'Deliveries', <order reference>]`. `RouteHandle.trailingCrumb` gains `'orderReference'` and
  `'deliveryReference'`, read from the loaded order/delivery like `productName`.
- Sidebar: a "Sales" group above "Catalogue", shown with `orders.view`: Orders (`shopping-bag`, with the pending
  count as a small count pill when above zero) and Deliveries (`truck`).

## Freshness

Orders arrive from the storefront without anyone in the dashboard acting, so the default `staleTime: Infinity` is
not enough. The orders list, its counts and the sidebar pending count refetch every 60 seconds and on window focus.
Detail screens refetch on window focus. Every mutation writes the returned order/delivery into its detail cache and
invalidates the store's order and delivery lists. Confirm and cancel also invalidate the store's products and stock
movement queries, because they change stock.

## Orders list

Follows `screens/Orders.jsx` with these changes:
- No Export button, no row selection, no packing slips, no Zone or Date placed buttons.
- Toolbar: search `Input` (icon search, size sm, placeholder "Reference or phone", hint behaviour as Products'
  search: typed value applies after a short pause and resets the page) and a `Chip` "Fee pending" that toggles
  `delivery_fee=pending`. Filters and page live in the URL (`?status=&q=&fee=pending&page=`), like the products list.
- Tab counts reflect the current search and fee filter.
- Columns: Placed (`formatMovementTime`), Buyer (name as a link to the order, so rows are reachable by keyboard; phone
  beneath), Zone (`zone_name` or "—", plus a warning `Badge` "Quote" when `delivery_fee_pending`), Order
  (`StatusBadge kind="order"`; for pending orders whose `hold_expires_at` is within 6 hours, a warning `Badge`
  "Hold ends {time}" under it), Delivery (`StatusBadge kind="delivery"` or "—"), Total (KES) (`formatAmount`).
- Footer "Showing {from}–{to} of {total}" with previous/next, 25 per page; a page past the end redirects to the last.
- Empty states: "No orders yet. They'll appear here when buyers check out." for the unfiltered All tab; "No orders in
  this view." otherwise. A list error shows the retry state used on Products.

## Order detail

Follows `screens/OrderDetail.jsx`:
- Header: "Order {reference}" (OrderRef lg, copyable), sub "Placed {time} · {buyer}", back link "Orders".
- Actions by status (only with `orders.manage`):
  - pending: Cancel, Confirm order (primary).
  - confirmed: Cancel, Dispatch (primary).
  - dispatched: Mark completed (primary, enabled only when the delivery is `delivered`); Cancel only when the delivery
    is `failed` or `returned` (the API refuses while the parcel is out or delivered).
  - completed / cancelled: none.
- Status card: status badge + `LifecycleStepper` (Pending, Confirmed, Dispatched, Completed) with each step's time
  from `created_at`, `confirmed_at`, `dispatched_at`, `completed_at`. Current = the furthest step reached; a cancelled
  order shows the stepper greyed (`cancelled`). Pending orders show "Stock held until {time}" under the badge.
- Items card (flush): rows Product (icon tile + product name, variant label beneath), SKU, Qty, Unit
  (`unit_price_paid`), Line total. Footer: Subtotal; "Offer savings" when `discount_total` is above zero; "Delivery ·
  {zone name or 'No zone'}" showing the fee, or a warning `Badge` "Pending quote"; with `orders.manage` and status
  pending or confirmed a small ghost button "Set fee" (pending) or "Change" (set); Total (`grand_total`; while the fee
  is pending, the label reads "Total so far").
- Fee dialog: title "Set delivery fee", description "Agree the fee with the buyer first. It's added to the order
  total.", `Input` label "Fee" prefix "KES" placeholder "350.00" validated with `isValidPrice` ("Enter a fee — 0 for
  free"), buttons Cancel / "Save fee". Toast "Delivery fee set" (description = reference).
- Activity card: `Timeline`, newest first, built from:
  - "Order placed" (`created_at`, icon shopping-bag, meta "Storefront checkout", plus " · stock held until {time}"
    while pending).
  - "Order confirmed" (`confirmed_at`, tone filled, icon check, meta "Stock committed").
  - the delivery's timeline events, titled as on the delivery detail.
  - "Order completed" (`completed_at`, tone success, icon circle-check).
  - "Order cancelled" (`cancelled_at`, tone danger, icon x, meta "by {cancelled_by.name}" when known, note = reason);
    when `cancel_reason` is `not_confirmed`, title "Cancelled automatically" and note "The stock hold ran out before
    the order was confirmed."
- Buyer card: avatar, name, phone; email when present; address lines, city, region, postal code, country name. The
  "Call buyer" icon button is a `tel:` link.
- Delivery card: with a delivery — status badge (using `status_label`), Method, Courier, Tracking (link to
  `tracking_url` when present), Zone, and a ghost button "Open delivery". Without one — "No delivery yet. It's
  created when you dispatch the order."
- Payment card: as the design (Unpaid while pending, Arranged offline after confirmation, no badge when cancelled)
  with its note.
- Confirm: no dialog (as the design). Toast "Order confirmed". A 409 `hold_expired` shows its message as an error
  toast and refetches the order.
- Cancel dialog: title "Cancel this order?", description "Its stock goes back on sale. The buyer isn't notified
  automatically.", `Textarea` label "Reason" placeholder "Buyer changed their mind", required (1–255), buttons "Keep
  order" / "Cancel order" (danger). Toast "Order cancelled".
- Dispatch dialog: title "Dispatch order"; description "Hand the parcel over, then dispatch it here." for courier,
  "The buyer can collect it from the store." for pickup. Fields: Method radios Courier / Pickup (fixed and shown as
  text when the order already has a delivery); Courier `Select` of active couriers (required for courier; with none,
  the Courier radio is disabled and the hint reads "No active couriers. Choose pickup, or ask an owner to add a
  courier."); Tracking number (optional, max 100). While the fee is pending the dialog shows a warning `Alert` "Set the
  delivery fee before dispatch." and the Dispatch button is disabled. Submit: create the delivery when there is none,
  or update its tracking when courier/number changed, then dispatch. Buttons "Not yet" / "Dispatch". Toast "Order
  dispatched".
- Mark completed: no dialog. Toast "Order completed".

## Deliveries list

Follows `screens/Deliveries.jsx`: tabs All + the seven statuses (no counts, as the design), search (placeholder
"Order reference or tracking number"), courier `Select` (all couriers, placeholder "All couriers"), "Clear" when either
is set, columns Order (OrderRef as a link), Method, Courier, Tracking, Status (`status_label`), Dispatched, Last update.
URL-held filters and paging as the orders list. Empty "No delivery matches that reference or tracking number." when
searching, "No deliveries in this view." otherwise.

## Delivery detail

Follows `screens/Deliveries.jsx` `DeliveryDetail`, with:
- Header "Delivery {order reference}", sub "{Pickup|Courier} · last update {time}", back link "Deliveries".
- Actions (with `orders.manage`) exactly as the design per status and method. Mark failed / Not collected opens the
  reason dialog (required, max 255); Mark returned opens its confirm dialog; Retry delivery opens the courier/tracking
  dialog (courier select of active couriers, prefilled; tracking number). Toasts as the design.
- When the delivery is `delivered` and its order is still `dispatched`, a card above the grid: "Delivered. Complete
  the order to close the sale." with a primary small button "Complete order" (`orders.manage`).
- Banners for `failed` and `preparing` as the design ("Go to order" links to the order).
- Timeline card ("Newest first", "Add note" while not final): items from the API timeline, newest first:
  - null → preparing: "Delivery created", icon package, meta "by {actor}".
  - → dispatched: "Dispatched" / "Ready for collection", tone filled, icon package-check, meta "by {actor} ·
    {courier}"; from failed: "Retried · dispatched again", icon rotate-cw.
  - → in_transit: "In transit", tone info, icon truck, meta courier · tracking.
  - → delivered: "Delivered" / "Collected", tone filled, icon circle-check.
  - → failed: "Delivery failed", tone danger, icon circle-alert, note = event note.
  - → returned: "Returned to store", icon undo-2.
  - → cancelled: "Cancelled with the order", tone danger, icon x.
  - note: "Note", icon message-square, note = text.
  "by {actor}" (`actor.name`) is omitted when `actor` is null.
- Status card, Tracking card (courier only; "Edit" only in `preparing` or `failed`, the API's rule; "Open tracking
  page" uses `tracking_url`), Order card (reference, buyer and zone from `GET /orders/{order_id}`, "Open").
- Edit tracking dialog: description "Leave a field empty to clear it."; Retry dialog as the design.

## Errors and permissions

- `getActionErrorMessage` also returns the API's message for 409 responses. Dialog actions show errors inside the
  dialog; header actions show an error toast. After a 409 the order/delivery is refetched.
- Without `orders.manage` the screens are read-only: no action buttons, no fee button, no Add note, no Edit.

## Left to the builder

File layout, hook names and component splits follow the repo's conventions (CLAUDE.md). New primitives:
`Timeline`, `LifecycleStepper`, `Radio`; `StatusBadge` gains the `order`, `delivery` and `payment` kinds. Shared
helpers for order and delivery status rules (which actions show in which state) live in `src/utils/`.
