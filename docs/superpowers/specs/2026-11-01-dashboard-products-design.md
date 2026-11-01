# Dashboard products — design

Date: 2026-11-01
Repos: `erp-dashboard` (React SPA, this repo) and `commerce-erp-api` (Laravel, sibling folder `../commerce-erp-api`)

## Intent

Zion is pre-launch and has no catalogue yet. The first real job in the dashboard will be loading it: creating
products with their sizes/colours, prices, photos and opening stock, then publishing them so the storefront shows
them. This slice builds the Catalogue → Products area so that job can be done end to end against the real API.

The user asked for exactly what the design system shows ("just use what the design has"), so the screens come from
the Commerce ERP design system (claude.ai design project `45d60803-0b17-44d5-abe4-afe6f29b1d79`, read through
DesignSync): `ui_kits/admin/Products.jsx`, `ProductNew.jsx`, `ProductDetail.jsx`, `OptionTypes.jsx`, `Shell.jsx`,
`App.jsx` (breadcrumbs), `components/**`, `readme.md` (voice, money format, layout rules). The behaviour comes from
the API (`../commerce-erp-api`, Catalog and Inventory modules; the code is the truth where `docs/api/openapi.yaml`
disagrees). Where design and API disagree, the API wins and the design is adjusted as listed under "Design
adjustments".

## Goals

- Products list with status tabs, search by name or SKU, category filter, and paging.
- Add product: details, category, base price, images, option types and values, the generated variant grid with
  per-variant price and opening stock, then "Save draft" or "Publish".
- Product detail: edit details, category, URL handle, featured flag; manage images (upload, delete, set cover,
  reorder); variants (inline price, sellable switch, add variant with opening stock); stock history; publish,
  unpublish, archive and restore.
- Option types screen: add, rename and delete types; add, rename, reorder, retire/restore and delete values.
- Categories screen (not in the design, see "Additions") so categories exist for the product form.
- Sidebar gains "Catalogue → Products"; the top bar shows real breadcrumbs per route.
- Controls respect permissions from the session.

## Non-goals

- Offers: no "Add to offer", no offer badge, no sale price (Offers is its own later module; the staff product API
  exposes no offer data).
- Stock screens (Inventory → Stock, per-variant stock page, the detail page's "Adjust" stock dialog). Stock is only
  written here as opening stock for new variants.
- "View on store" (the staff API exposes no storefront URL).
- SEO title, meta description, short description, photo option type and image tagging by option value (API supports
  them; the design doesn't show them).
- Deleting products (not in the design; archive covers it).
- Bulk actions, the row "…" menu, CSV import.
- The Overview dashboard (parked; notes in `.superpowers/brainstorm/overview-notes.md`).

## Anti-goals

- Showing a number or state the API didn't give. Totals the API lacks are computed from the variants it returned,
  never invented; anything we cannot know (offers, storefront URL) is left out rather than faked.
- Losing work silently. Add product is several API calls; if one fails after the product exists, the user must end
  up on the saved draft with a plain message saying what didn't save — never a blank form or a half-made product
  they can't find.
- Hand-coloured statuses. Product statuses render through `StatusBadge` exactly as the design maps them.

## API the dashboard uses

Base `/api/v1/stores/{store}` where `{store}` is the session's store id (from `useSession`, never the URL). Money
comes as `{ amount: "1500.00", currency: "KES" }` or `null`; prices are sent as strings with two decimals. Lists are
Laravel pages: `{ data, links, meta: { current_page, per_page, total, last_page } }`. 422s are `{ message, errors }`
and their messages are shown as-is next to the field (or as a page/dialog alert when the key isn't a form field).

| Use | Call | Permission |
| --- | --- | --- |
| List | `GET /products?status&category&search&per_page&page` | `catalogue.view` |
| Tab counts | the same call with `per_page=1` for all / each status, read `meta.total` | `catalogue.view` |
| Show | `GET /products/{id}` (includes `variants[]` with `stock`, `images[]`) | `catalogue.view` |
| Create | `POST /products` (`title, description, category_ids, price, is_featured, option_type_ids`, and `sku` only when there are no option types) | `catalogue.manage` (+ `pricing.manage` because `price` is sent) |
| Update | `PATCH /products/{id}` (`title, description, slug, category_ids, is_featured, price`) | `catalogue.manage` (+ `pricing.manage` if `price` sent) |
| Publish / unpublish / archive | `POST /products/{id}/publish|unpublish|archive` | `catalogue.manage` |
| Variant create | `POST /products/{id}/variants` (`option_value_ids`, optional `price`) | `catalogue.manage` (+ `pricing.manage` if `price`) |
| Variant update | `PATCH /products/{id}/variants/{variantId}` (`price` — `null` clears the override, `is_active`) | `catalogue.manage` (+ `pricing.manage` if `price`) |
| Opening stock | `POST /stock-adjustments` (`variant_id`, `type: "receipt"`, `change`, `reason: "Opening stock"`) | `inventory.manage` |
| Stock history | `GET /stock-movements?product_id&per_page` (new filter, see Backend) | `inventory.view` |
| Images | `POST /products/{id}/images` (multipart `file`, `alt_text`), `DELETE …/images/{imageId}`, `POST …/images/{imageId}/main`, `PUT …/images/order` (`image_ids`, every image once) | `catalogue.manage` |
| Option types | `GET/POST /option-types`, `PATCH/DELETE /option-types/{id}`, `POST /option-types/{id}/values`, `PATCH/DELETE …/values/{valueId}` (`value`, `sort_order`, `is_active`) | view / `catalogue.manage` |
| Categories | `GET /categories` (tree with `children`), `POST`, `PATCH`, `DELETE /categories/{id}` | view / `catalogue.manage` |

Rules from the API the UI must follow:

- New products are always drafts. Publishing needs a base price and at least one active variant (images and stock
  are not required). Publishing an archived product is refused; "Restore" is `unpublish` (archived → draft).
- Archived products are read-only: every edit returns 422 "Archived products can't be edited. Unpublish first." The
  detail page shows archived products with all inputs disabled and only "Restore" available.
- A product without option types gets one default variant on create. With option types it has none until variants
  are created; option types can't change once the product has variants.
- Variant option values are fixed after creation. A published product must keep one active variant; deactivating
  the last one returns a 422 that is shown as-is.
- Uploads: jpg, png or webp, at most 5 MB, at least 200 px on the shorter side, at most 20 images per product;
  `alt_text` is required (the dashboard sends the product name). The first image becomes the cover automatically.
- Option values: inactive (retired) values can't be used for new variants; values used by variants can't be
  deleted; option types linked to any product can't be deleted.
- Category delete is refused while it has subcategories; products in a deleted category just lose the link.

## Screens

Every screen uses the design system's tokens and components (`ce-*` look, Lucide icons), the `PageHeader` pattern
from `Shell.jsx` (title, one-line sub, actions on the right, "← Products" back link on sub-pages), and the copy rules
in the design `readme.md` (sentence case, verb + object buttons, money as `KES 4,500.00`, headers carry the unit).
Successful actions show a bottom-right toast (title + product name), as in the design.

### Products list (`/products`)

As `Products.jsx`: header "Products", sub "Only published products with a price show on the storefront.", actions
"Option types" and "Add product" (primary). One flush card with tabs All / Published / Draft / Archived (each with
its `meta.total` count), a search input ("Name or SKU", debounced 300 ms) and a category select ("All categories"),
then the table: Product (cover thumbnail or neutral tile with an image icon, name, "Featured" badge, category
names), Status, Variants (`variants_count`), Available (`stock_available`; red at 0, amber at 1–3), Price (KES)
(base price, "—" when unset). Clicking a row opens the product. Paging: 25 per page with a footer
"1–25 of 61" and previous/next buttons, shown only when there is more than one page. Empty states: no products at
all ("No products yet" + "Add product"), and no matches for the current filters ("No products match").

The category filter matches products linked directly to the chosen category (the API has no "include
subcategories" option); the select lists every category, indented by level. Tab, search, category and page live in
the URL query string so back/forward and reload keep them.

### Add product (`/products/new`)

As `ProductNew.jsx`. Left column: Details card (Name, Description optional, Category select, Base price with "KES"
prefix and hint "Variants inherit this unless you override it"); Images card (pick files; they are kept in the page
and uploaded after the product is created; first is the cover; remove before saving); Options card (chips for every
option type, then chips for each chosen type's active values; choosing a category does not preselect anything — the
design's per-category defaults are fake data); Variants card (one row per combination in option-type order, or one
"Default" row when no options; SKU column shows "Generated on save"; per-row price input with the base price as
placeholder; per-row opening stock). Right column (sticky): Visibility card ("Feature on homepage when published"
switch, note "Drafts are hidden from the storefront. Opening stock is recorded as a receipt.") and "Ready to
publish?" checklist (Name, Category, Price, "At least one image" marked recommended).

Header actions: Discard (back to the list, confirms first if anything was typed), Save draft, Publish (primary).
Validation (Zod): Save draft needs a name; Publish also needs a category and a base price above 0. Per-row price
and stock: blank or a valid number (price ≥ 0.01 with at most 2 decimals; stock a whole number 0–1,000,000).
The store's real minimum price (default KES 1.00) is enforced by the API and isn't in the session, so its 422
("The price must be at least …") is shown next to the price field, or in the save alert for a variant row.
At most 200 variant rows (the API's limit); above that the Variants card says so and both save buttons are disabled.

Saving runs these steps in order and shows a progress state on the clicked button:

1. `POST /products` (always a draft; `price` = base price, `is_featured`, `category_ids: [category]`,
   `option_type_ids` in the order the types were chosen).
2. With options: `POST …/variants` once per row with its `option_value_ids` and `price` only if the row has one.
   Without options: the default variant from step 1; if its row has a price, `PATCH` it.
3. Opening stock: one `POST /stock-adjustments` receipt per row with stock > 0.
4. Images: upload each in order.
5. Publish: only for "Publish".

If step 1 fails, stay on the form with the errors mapped to fields. If any later step fails, stop, go to the new
product's detail page, and show an alert there naming what didn't finish (e.g. "Saved as a draft, but 2 variants,
opening stock for 1 variant and 1 image didn't save: <API message>. Add them below."). On success go to the detail
page with the toast "Product published" or "Draft saved".

Without `pricing.manage` the price inputs are disabled with the hint "You can't set prices" and no `price` key is
sent; Publish is then disabled (a base price is required). Without `inventory.manage` the opening stock column is
hidden.

### Product detail (`/products/:productId`)

As `ProductDetail.jsx`. Header: product name + status badge; sub "Dresses · 6 variants · 14 on hand"; "← Products";
actions by status:

- Draft: Archive, Publish (primary), Save changes.
- Published: Archive, Unpublish, Save changes.
- Archived: Restore (to draft). Nothing else; all inputs disabled.

"Save changes" is disabled until a field in Details, Visibility or a variant price changes; it PATCHes the product
(only changed fields) and then each changed variant, and reports any failure in an alert. Leaving the page with
unsaved changes asks for confirmation. Archive opens the design's confirm dialog ("Archive this product?", "It's
removed from the storefront and can't be ordered. Existing orders aren't affected.", Keep / Archive).

Left column:
- Details card: Name, Description, Category select, URL handle (`slug`, prefix "/p/", hint that the old address
  keeps redirecting).
- Images card: tiles in order with the cover marked; per tile: set as cover, move left/right, delete (confirm);
  "Upload" adds files (uploads immediately, one toast per batch). Image actions apply immediately, not via Save.
- Tabbed card: Variants (count) and Stock history (count from `meta.total`).
  - Variants table: Variant (values joined with " · ", or "Default"), SKU (mono), Price (KES) input (placeholder is
    the base price; blank = inherit), Available (`stock.available`, red/amber as the list), Sellable switch
    (`is_active`, applies immediately — not part of Save). "Add variant" opens the design dialog: one select per
    option type (active values only), price, opening stock ("Recorded as a receipt"); duplicate combinations are
    blocked inline; when every combination exists the dialog says so and points to Option types. Hidden for
    products without option types.
  - Stock history table (needs `inventory.view`, otherwise the tab is hidden): When, Variant, Type badge, Change
    (+/−), After, By (actor name, or the order reference when `order_id` is set — shown as "Order #<id>" since the
    movement has no reference), newest first, 25 per page with "Load more". Empty: "No stock movements yet."

Right column:
- Visibility card: status row, "Featured on homepage" switch (disabled unless published, as the design), the
  one-line explanation per status from the design.
- Pricing card: Base price (an input, "KES" prefix — the only place to set it after creation; part of Save), Price range across active variants' `effective_price` ("KES 4,500.00" or
  "KES 4,500.00 – 5,200.00").
- Inventory card: On hand (sum of `stock.on_hand`), Held in pending orders (sum of `stock.reserved`), Out of stock
  variants (active variants with `available ≤ 0`), and the design's low/sold-out line. No Adjust button.

Not found / no access: a 404 from the API shows the shell's Page not found; a 403 shows "You don't have access to
products."

### Option types (`/products/option-types`)

As `OptionTypes.jsx`: list of types on the left (name, active values, count of active values), the selected type on
the right: Name (rename on blur/enter), "Used by N products" / "Not used by any product yet", Delete type (enabled
only when unused; confirm dialog), values in order with move up/down, rename inline, Retire/Restore for values
used by variants, Delete for unused values, and an "Add value" row. "Add option type" dialog. Duplicate names are
caught inline from the loaded list and from the API 422. Each action calls the API immediately and shows a toast;
reorders send `sort_order` for the values whose position changed.

### Categories (`/products/categories`) — addition

Not in the design. Same two-column pattern as Option types: tree on the left (up to 3 levels, indented), the selected
category on the right: Name, Parent select ("None" or another category, excluding itself and its descendants),
"Visible on storefront" switch, Delete (confirm; refused with the API message while it has subcategories). "Add
category" dialog (Name, Parent). Reached from an "Categories" button next to "Option types" on the list header. Slug,
description and SEO fields are left to the API defaults.

## Navigation, routes, breadcrumbs

- Routes (all inside `ProtectedRoute` → `AppShell`): `/products`, `/products/new`, `/products/option-types`,
  `/products/categories`, `/products/:productId` (numeric; anything else falls to Page not found). Added to
  `ROUTES` as constants plus a builder for the detail path.
- Sidebar: add the "Catalogue" group with "Products" (Lucide `package`), active on every `/products…` route, shown
  only with `catalogue.view`. The other design nav items stay out until their modules exist.
- Breadcrumbs: the top bar shows the trail from the design's `App.jsx` titles: Catalogue › Products, Catalogue ›
  Products › New, Catalogue › Products › Option types, Catalogue › Products › Categories, Catalogue › Products ›
  <product name>. Overview stays "Overview". The trail comes from the route (route `handle`), with the product name
  read from the product query.

## Permissions

- No `catalogue.view`: Products is not in the sidebar and the routes show "You don't have access to products."
- No `catalogue.manage`: everything is read-only (no Add product, no Save/Publish/Archive, no image or option-type or
  category edits, switches disabled).
- No `pricing.manage`: price inputs disabled; no `price` key ever sent.
- No `inventory.view`: no Stock history tab. No `inventory.manage`: no opening stock fields.
- A 403 never signs the user out. The API's 403 body is a bare "Forbidden", so the dashboard shows fixed copy: on
  a screen load "You don't have access to products.", on an action "You don't have permission to do that."
- Without `pricing.manage` a user can still save drafts (someone else prices them). Without `inventory.manage`
  Publish is still allowed; the API doesn't require stock.

## Backend changes (`commerce-erp-api`)

1. `GET /stock-movements` accepts `product_id` (integer, must be a product in the store) and returns that product's
   variants' movements; `variant_id` keeps working; both together must agree (variant of that product) or 422.
2. Option-type payloads gain usage counts: each type `products_count` (products linked to it), each value
   `variants_count` (variants using it). Included on the option-types list and on create/update responses.
3. `openapi.yaml` updated for both, plus the two disagreements found while mapping: product list `search` matches
   title and SKU (not slug), and publish also 422s on `price` when the base price is unset.

Each change ships with Pest tests in the existing style, and `php artisan test` stays green.

## New design-system primitives in the dashboard

Built from the design's `components/**` (`.jsx`, `.d.ts`, `.prompt.md`, `components.css`) like the existing ones:
Badge, StatusBadge (all the design's kinds, used here for `product`), Tabs (underline and pill), Select, Textarea,
Switch, Dialog (confirmations and short forms; focus trapped, Escape closes), Toast (with a small provider and a
`useToast` hook; bottom-right, ~5 s), DataTable, OrderRef (mono chip for SKUs), and a Chip toggle for option values.
A `formatMoney` utility renders `KES 4,500.00`.

## What's left to the builder

File layout, hook names and query keys (following `CLAUDE.md`), how the save steps are sequenced in code, test
structure, debounce mechanics, exact empty-state copy beyond what's written here.

## Calls I made (the user said to follow the design; these fill gaps)

1. Categories screen added (not designed) — nothing seeds categories and the product form needs one.
2. Category is a single select sending `category_ids: [id]` (API allows several; the design shows one).
3. List column "On hand" renamed "Available" — the list API gives sellable stock, not on hand.
4. Tab counts come from four `per_page=1` calls instead of a new counts endpoint.
5. Offers, "View on store", the Adjust stock button and the row "…" menu are left out.
6. Image alt text is the product name; uploads on Add product happen after the product is created.
7. The design's per-category option defaults are not copied (they were demo data).
8. Stock history "By" shows "Order #<id>" for sales (movements carry no order reference).
9. Two small API additions (product filter on stock movements, usage counts on option types).
10. Client-side price floor is 0.01; the store's minimum comes back as the API's own error.
11. 403s show fixed copy (the API's message is just "Forbidden").
12. The category filter doesn't include subcategories.
13. Base price is editable in the Pricing card on the detail page (the design has no field for it, but publishing needs it).
