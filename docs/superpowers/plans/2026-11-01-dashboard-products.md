# Dashboard Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Catalogue → Products area (list, add, detail, option types, categories) against the real API, plus two small API additions.

**Architecture:** Each screen is a page in `src/pages/products/` composed from feature components in `src/components/products/` and design-system primitives in `src/components/ui/`. Server state is React Query: one self-contained hook file per call under `src/hooks/api/{queries,mutations}/catalogue/`, keyed per store. The multi-call "Add product" save is an ordered async flow in one hook that reports what didn't finish.

**Tech Stack:** React 19, TypeScript 5.9, React Router 6 (data router), TanStack Query 5, Axios, React Hook Form 7 + Zod 3, Tailwind 3 on the design tokens, lucide-react, Vitest 4 + Testing Library + MSW 2. API: Laravel 12, Pest.

**Spec:** `docs/superpowers/specs/2026-11-01-dashboard-products-design.md`

**Design reference (read this, not DesignSync):** `.superpowers/design-ref/` — `README.md`, `components.css`, `components.jsx`, `screens/*.jsx`, and `products-api-contract.md` (exact API fields, rules and error messages, read from the code).

## Global Constraints

- Follow `CLAUDE.md` exactly: file naming, full-word identifiers, import order, `@/` alias, no barrel files, no `fetch`, every request through `axiosInstance`, every key in `queryKeys`, every path in `ROUTES`, no mocked routing primitives or data hooks in tests (MSW only).
- Store id comes from the session (`useAuthedSession().store.id`), never from the URL.
- Money from the API is `{ amount: "1500.00", currency: "KES" }` or `null`; display as `KES 4,500.00` via `formatMoney`; send prices as strings with two decimals (`"4500.00"`).
- Copy: sentence case; buttons are verb + object; table headers carry units ("Price (KES)"); no emoji, no exclamation marks; API 422 messages are shown as-is.
- 403 copy is fixed: screen load "You don't have access to products."; action "You don't have permission to do that." A 403 never signs out.
- Any `price` key requires `pricing.manage`; without it the dashboard never sends `price`.
- Primitives match `.superpowers/design-ref/components.css` using the Tailwind tokens already in `tailwind.config.ts`; no inline `style` except where Tailwind can't reach.
- Lucide icons via the existing `Icon` component (stroke 1.75).
- Dashboard work on branch `feature/products` in this repo; API work on branch `feature/catalogue-support` in `../commerce-erp-api`. At the end both merge into `main` locally (see `CLAUDE.md` "Finishing a branch").
- Dashboard checks before each commit: `npm run typecheck && npm run lint && npx vitest run`; API: `php artisan test --compact` and `vendor/bin/pint --dirty`.

## Review Focus

1. Add product fails part-way (e.g. the 2nd variant POST returns 422) → the user lands on the draft's detail page with the "Saved as a draft, but …" alert; nothing is lost silently. (Task 9 test.)
2. Archived product → every input and switch disabled, only "Restore" in the header, no image/variant actions. (Task 10 test.)
3. User without `pricing.manage` creates or edits a product → no request body contains a `price` key. (Tasks 9 and 10 tests.)
4. Leaving the detail page with unsaved edits → "Discard changes?" dialog; Keep editing stays. (Task 10 test.)
5. A 403 on a products screen load → "You don't have access to products." and the user stays signed in. (Task 8 test.)

---

### Task 1: API — product filter on stock movements, usage counts on option types

Repo: `../commerce-erp-api`, branch `feature/catalogue-support` from `main`.

**Files:**
- Modify: `app/Modules/Inventory/Http/Requests/IndexStockMovementsRequest.php`, `app/Modules/Inventory/Queries/ListStockMovements.php`
- Modify: `app/Modules/Catalog/Http/Resources/OptionTypeResource.php`, `OptionValueResource.php`, `app/Modules/Catalog/Http/Controllers/OptionTypeController.php`, `OptionValueController.php` (load the counts wherever a type/value is returned)
- Modify: `docs/api/openapi.yaml`
- Test: `tests/Feature/Inventory/StockMovementListTest.php` (or the existing stock-movements list test file), `tests/Feature/Catalog/OptionTypeTest.php` (or existing equivalent)

**Interfaces:**
- Produces: `GET /stores/{store}/stock-movements?product_id=` ; option type JSON `products_count: int`; option value JSON `variants_count: int`.

- [ ] **Step 1: Write failing tests** (Pest, in the existing style of the neighbouring tests):
  - `it('filters stock movements by product')` — two products with movements; `?product_id=<a>` returns only movements of product A's variants, newest first.
  - `it('rejects a product from another store')` — 422 on `product_id`.
  - `it('rejects a variant that is not on the given product')` — `product_id=A&variant_id=<variant of B>` → 422 on `variant_id` with message "This variant isn't on that product."
  - `it('reports how many products use each option type')` — type linked to 2 products → `products_count` 2; unlinked type → 0.
  - `it('reports how many variants use each option value')` — value on 3 variants → `variants_count` 3; unused → 0. Assert on the list, on POST/PATCH type and on POST/PATCH value responses.
- [ ] **Step 2: Run** `php artisan test --compact --filter='stock movements|option'` — expect the new tests to FAIL.
- [ ] **Step 3: Implement.** `product_id`: `sometimes|nullable|integer`, exists in `products` for the store; filter with `whereIn('stock_movements.product_variant_id', <variant ids subquery on product_variants.product_id>)`. Counts: `withCount` / subquery counts on `product_option_types` (per type) and `product_variant_option_values` (per value); resources emit `products_count` / `variants_count` (integers, always present).
- [ ] **Step 4: Update `openapi.yaml`:** the new query param and the two count properties (required, integer, minimum 0); product list `search` description → "title or variant SKU"; publish 422 also covers `price` ("A product needs a price to be published."). Keep `OpenApiContractTest` and any schema-checking tests green.
- [ ] **Step 5: Run** `php artisan test --compact` → all pass; `vendor/bin/pint --dirty`.
- [ ] **Step 6: Commit** `feat(catalogue): product filter on stock movements and option usage counts` (with the attribution trailer).

---

### Task 2: Catalogue types, money, errors, query keys, fixtures, card

**Files:**
- Create: `src/types/catalogue.ts`, `src/utils/money.ts`, `src/utils/money.spec.ts`, `src/hooks/useAuthedSession.ts`, `src/utils/storePath.ts`, `src/tests/fixtures/catalogue.ts`
- Modify: `src/utils/apiErrors.ts` (+ `apiErrors.spec.ts`), `src/hooks/api/queryKeys.ts`, `src/tests/mocks/endpoints.ts`, `src/tests/mocks/handlers.ts`, `src/components/ui/Card.tsx`

**Interfaces — Produces:**

```ts
// src/types/catalogue.ts
export type Money = { amount: string; currency: string };
export type ProductStatus = 'draft' | 'published' | 'archived';
export type ProductImage = { id: number; url: string; original_url: string; alt_text: string; width: number; height: number; sort_order: number; is_main: boolean; option_value_ids: number[] };
export type VariantStock = { on_hand: number; reserved: number; available: number };
export type VariantOptionValue = { option_type_id: number; option_value_id: number; value: string };
export type ProductVariant = { id: number; product_id: number; sku: string; is_active: boolean; sort_order: number; price: Money | null; effective_price: Money | null; is_default: boolean; option_values: VariantOptionValue[]; stock: VariantStock };
export type ProductListItem = { id: number; title: string; slug: string; description: string | null; status: ProductStatus; price: Money | null; is_featured: boolean; published_at: string | null; category_ids: number[]; option_type_ids: number[]; variants_count: number; stock_available: number; main_image: ProductImage | null; created_at: string; updated_at: string };
export type Product = Omit<ProductListItem, 'variants_count' | 'stock_available'> & { variants: ProductVariant[]; images: ProductImage[] };
export type OptionValue = { id: number; option_type_id: number; value: string; sort_order: number; is_active: boolean; variants_count: number };
export type OptionType = { id: number; name: string; sort_order: number; values: OptionValue[]; products_count: number };
export type Category = { id: number; parent_id: number | null; name: string; slug: string; sort_order: number; is_visible: boolean; children?: Category[] };
export type StockMovementType = 'receipt' | 'adjustment' | 'sale' | 'return';
export type StockMovement = { id: number; variant_id: number; type: StockMovementType; quantity: number; on_hand_after: number; reason: string | null; actor: { id: number; name: string } | null; order_id: number | null; created_at: string };
export type Paginated<T> = { data: T[]; meta: { current_page: number; per_page: number; total: number; last_page: number } };
```

- `formatMoney(money: Money | null, fallback = '—'): string` → `"KES 4,500.00"`; `formatAmount(money: Money | null, fallback = '—'): string` → `"4,500.00"` (for cells under a "(KES)" header); `toMoneyInput(value: string): string` → `"4500.00"` from user input `"4500"`/`"4,500.5"`; `isValidPrice(value: string): boolean` (≥ 0.01, ≤ 9,999,999,999.99, at most 2 decimals, commas allowed).
- `useAuthedSession(): Extract<Session, { status: 'authed' }>` — throws `Error('useAuthedSession used outside ProtectedRoute')` if not authed.
- `storePath(storeId: number, path: string): string` → `/api/v1/stores/${storeId}${path}`.
- `apiErrors.ts` adds `getFirstValidationMessage(error: unknown): string | undefined` (first message of the first key in `errors`) and `getActionErrorMessage(error: unknown): string` (403 → "You don't have permission to do that."; 422 → first validation message or the body `message`; otherwise "Something went wrong. Try again.").
- `queryKeys` adds: `products: (storeId: number) => ['stores', storeId, 'products'] as const`, `productList: (storeId: number, filters: ProductListFilters) => [...products(storeId), 'list', filters] as const`, `product: (storeId: number, productId: number) => [...products(storeId), 'detail', productId] as const`, `optionTypes: (storeId: number) => ['stores', storeId, 'option-types'] as const`, `categories: (storeId: number) => ['stores', storeId, 'categories'] as const`, `stockMovements: (storeId: number, productId: number) => ['stores', storeId, 'stock-movements', productId] as const`. `ProductListFilters = { status?: ProductStatus; search?: string; category?: number; page?: number; perPage?: number }` exported from `queryKeys.ts`.
- Fixtures (`src/tests/fixtures/catalogue.ts`): `buildMoney(amount: string): Money`, `buildProductImageFixture(overrides?)`, `buildVariantFixture(overrides?)`, `buildProductFixture(overrides?)` (draft "Ankara wrap dress", base price 4500.00, one default variant with stock 5/0/5, no images), `buildProductListItemFixture(overrides?)`, `buildOptionTypeFixture(overrides?)` (Size: S, M, L), `buildCategoryFixture(overrides?)` (Dresses), `buildPaginated<T>(data: T[], meta?: Partial<Paginated<T>['meta']>)`, `buildStockMovementFixture(overrides?)`.
- `mockEndpoints` adds store-scoped paths with `:storeId` (MSW path params): `products`, `product` (`…/products/:productId`), `productPublish`, `productUnpublish`, `productArchive`, `variants`, `variant`, `images`, `image`, `imageMain`, `imagesOrder`, `optionTypes`, `optionType`, `optionValues`, `optionValue`, `categories`, `category`, `stockMovements`, `stockAdjustments`. Default handlers: lists return empty (`buildPaginated([])` or `{ data: [] }`).
- `Card` gains optional `title`, `subtitle`, `actions`, `footer`, `flush` (as `components.jsx` Card); existing `<Card className>` callers keep working (no head when no title/subtitle/actions; body padding 20 unless `flush`).

- [ ] **Step 1: Write failing tests** — `money.spec.ts`: `formatMoney(buildMoney('4500'))` → `'KES 4,500.00'`, `formatMoney(null)` → `'—'`, `formatAmount(buildMoney('1234567.5'))` → `'1,234,567.50'`, `toMoneyInput('4,500.5')` → `'4500.50'`, `isValidPrice('0')` false, `isValidPrice('0.01')` true, `isValidPrice('1.234')` false, `isValidPrice('abc')` false. `apiErrors.spec.ts`: 403 → permission copy; 422 `{ errors: { price: ['The price must be at least 1.00.'] } }` → that message; 500 → "Something went wrong. Try again.".
- [ ] **Step 2: Run** `npx vitest run src/utils` — FAIL.
- [ ] **Step 3: Implement** the files above (`Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`, currency code from the money object).
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS (existing 62 still green).
- [ ] **Step 5: Commit** `feat(products): catalogue types, money helpers, query keys and fixtures`.

---

### Task 3: Design-system primitives — display and form controls

**Files (each with a co-located `.spec.tsx` only where noted):**
- Create in `src/components/ui/`: `Badge.tsx`, `StatusBadge.tsx` (+ spec), `Tabs.tsx` (+ spec), `Select.tsx`, `Textarea.tsx`, `Switch.tsx` (+ spec), `OrderRef.tsx`, `Chip.tsx`, `DataTable.tsx` (+ spec), `PageHeader.tsx`, `BackLink.tsx`
- Modify: `src/components/ui/Input.tsx` (add optional `prefix?: string`, `suffix?: string`, `size?: 'sm' | 'md'`, `icon?: LucideIcon`, and `hideLabel?: boolean` for table cells — the label stays in the DOM as `sr-only`)

**Interfaces — Produces** (match `components.jsx`/`components.css`; `forwardRef` + `displayName` for Select, Textarea, Switch, Input):
- `Badge({ tone?: 'neutral'|'primary'|'success'|'warning'|'danger'|'info'|'clay', size?: 'sm'|'md', dot?: boolean, children })`
- `StatusBadge({ kind: StatusKind, status: string, size?, label? })` with the full `MAP` from `components.jsx` (export `StatusKind`).
- `Tabs({ items: { value: string; label: string; count?: number }[], value: string, onChange(value: string): void, variant?: 'line'|'pill', label: string })` — `role="tablist"` with `aria-label={label}`, buttons `role="tab"` + `aria-selected`; arrow keys move focus.
- `Select` (native `<select>` with chevron; props `label`, `hideLabel?`, `hint?`, `error?`, `optional?`, `placeholder?`, `options: { value: string; label: string }[]`, `size?`), `Textarea` (`label`, `hint?`, `error?`, `optional?`, `rows?`), `Switch` (`label?`, `aria-label` when no label; `role="switch"`).
- `OrderRef({ value: string, plain?: boolean })` mono chip.
- `Chip({ isSelected: boolean, onClick(): void, children })` — the design's `PnChip`, `aria-pressed`.
- `DataTable<Row>({ columns: { key: string; header: string; align?: 'left'|'right'; width?: number; render?(row: Row): ReactNode }[], rows: Row[], getRowKey(row: Row): string | number, onRowClick?(row: Row): void, empty?: ReactNode, compact?: boolean, caption: string })` — `<caption className="sr-only">`; clickable rows are also reachable by keyboard (Enter on a focused row).
- `PageHeader({ title: ReactNode, sub?: ReactNode, actions?: ReactNode, back?: ReactNode })` (h1, as `Shell.jsx`), `BackLink({ to: string, children })` (arrow-left + text, a `Link`).
- Errors render through `FormErrorMessage` (CLAUDE.md rule).

- [ ] **Step 1: Write failing tests:**
  - `StatusBadge.spec.tsx`: `kind="product" status="archived"` renders "Archived"; unknown status `"on_hold"` renders "on hold".
  - `Tabs.spec.tsx`: clicking "Draft" calls `onChange('draft')`; the active tab has `aria-selected="true"`; a count renders inside its tab.
  - `Switch.spec.tsx`: `getByRole('switch', { name: 'Sellable' })` toggles `onChange`; disabled switch ignores clicks.
  - `DataTable.spec.tsx`: renders headers and cells; `empty` shows when `rows=[]`; clicking a row calls `onRowClick` with that row; pressing Enter on a focused row does too.
- [ ] **Step 2: Run** `npx vitest run src/components/ui` — FAIL.
- [ ] **Step 3: Implement** the components above.
- [ ] **Step 4: Run** typecheck, lint, tests — PASS.
- [ ] **Step 5: Commit** `feat(ui): badge, tabs, select, textarea, switch, data table and page header`.

---

### Task 4: Dialog and toasts

**Files:**
- Create: `src/components/ui/Dialog.tsx` (+ `Dialog.spec.tsx`), `src/components/ui/Toast.tsx`, `src/components/ui/ToastContext.tsx` (+ `ToastContext.spec.tsx`)
- Modify: `src/App.tsx` (wrap the outlet in `ToastContextProvider`)

**Interfaces — Produces:**
- `Dialog({ isOpen: boolean, title: string, description?: ReactNode, footer?: ReactNode, width?: number, onClose(): void, children? })` — portal to `document.body`, `role="dialog"`, `aria-modal`, labelled by the title, focus moves into the dialog and is trapped, Escape and overlay click call `onClose`, focus returns to the opener on close.
- `Toast({ tone?: 'success'|'danger'|'warning'|'info', title, description?, onClose })` as `components.jsx`.
- `ToastContextProvider({ children })` + `useToastContext(): { showToast(toast: { title: string; description?: string; tone?: ToastTone }): void }`. Toasts stack bottom-right (right 24, bottom 24), newest last, auto-dismiss after 5000 ms, dismiss button "Dismiss".

- [ ] **Step 1: Write failing tests:**
  - `Dialog.spec.tsx`: open dialog has `role="dialog"` named by its title; Escape calls `onClose`; Tab from the last button wraps to the first focusable element; closed dialog renders nothing.
  - `ToastContext.spec.tsx` (fake timers): `showToast({ title: 'Product saved', description: 'Ankara wrap dress' })` shows both texts in a `role="status"`; after 5000 ms it's gone; "Dismiss" removes it immediately.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(ui): dialog and toast notifications`.

---

### Task 5: Routes, sidebar, breadcrumbs, permission gate

**Files:**
- Modify: `src/constants/routes.ts`, `src/Router.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, `src/components/layout/AppShell.tsx`
- Create: `src/components/auth/RequirePermission.tsx`, `src/components/ui/NoAccess.tsx`, `src/pages/products/ProductsPage.tsx`, `ProductNewPage.tsx`, `ProductDetailPage.tsx`, `OptionTypesPage.tsx`, `CategoriesPage.tsx` (placeholders rendering their `PageHeader` title only — later tasks fill them), `src/types/routeHandle.ts`
- Test: `src/tests/features/Navigation/Navigation.spec.tsx`

**Interfaces — Produces:**
- `ROUTES` adds `PRODUCTS: '/products'`, `PRODUCT_NEW: '/products/new'`, `OPTION_TYPES: '/products/option-types'`, `CATEGORIES: '/products/categories'`, `PRODUCT_DETAIL: '/products/:productId'`; plus `buildProductPath(productId: number): string` exported from `routes.ts`.
- `RouteHandle = { crumbs: string[]; trailingCrumb?: 'productName' }` in `src/types/routeHandle.ts`. Handles: Overview `['Overview']`; Products `['Catalogue', 'Products']`; New `['Catalogue', 'Products', 'New']`; Option types `['Catalogue', 'Products', 'Option types']`; Categories `['Catalogue', 'Products', 'Categories']`; Detail `['Catalogue', 'Products']` + `trailingCrumb: 'productName'`. Not found `['Page not found']`.
- `Topbar` (no props) reads the deepest match's handle via `useMatches()`; for `productName` it reads the product title through `useProductQuery` (Task 8) — until Task 8 lands, show the crumbs only. Separator: `ChevronRight` 14; last crumb `text-text-primary`, truncates.
- `RequirePermission({ slug: string; message: string })` renders `<Outlet />` or `<NoAccess message>` (`NoAccess` = Card + EmptyState with a `Lock` icon and the message).
- Route tree inside `AppShell`: `{ element: <RequirePermission slug="catalogue.view" message="You don't have access to products." />, children: [products, new, option-types, categories, detail] }`. The detail route validates `productId` is digits; otherwise it renders `NotFoundPage`.
- Sidebar: section heading "Catalogue" (overline style from `Shell.jsx`) with "Products" (`Package` icon), active for any path starting with `/products`, only rendered when `hasPermission('catalogue.view')`. Sidebar takes `permissions: string[]` as a new prop.

- [ ] **Step 1: Write failing tests** (`Navigation.spec.tsx`, using `customRenderAtRoute` + MSW `me`):
  - `it('shows Products in the sidebar for catalogue staff and opens the list')` — click "Products" → `router.state.location.pathname === '/products'`, breadcrumb nav "Breadcrumb" contains "Catalogue" and "Products".
  - `it('hides Products without catalogue.view and shows no access on the URL')` — fixture without `catalogue.view`: no "Products" link; visiting `/products` shows "You don't have access to products."
  - `it('shows Page not found for a non-numeric product id')` — `/products/abc`.
  - `it('shows the Overview breadcrumb on the root page')`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS (update `AppShell.spec.tsx` only if its Overview-title assertion moved).
- [ ] **Step 5: Commit** `feat(products): routes, sidebar entry, breadcrumbs and permission gate`.

---

### Task 6: Categories screen

**Files:**
- Create: `src/hooks/api/queries/catalogue/useCategoriesQuery.ts`, `src/hooks/api/mutations/catalogue/useCreateCategoryMutation.ts`, `useUpdateCategoryMutation.ts`, `useDeleteCategoryMutation.ts`, `src/utils/categoryTree.ts` (+ `categoryTree.spec.ts`), `src/components/products/CategoryEditor.tsx`, `src/components/products/AddCategoryDialog.tsx`
- Modify: `src/pages/products/CategoriesPage.tsx`
- Test: `src/tests/features/Categories/Categories.spec.tsx`

**Interfaces — Produces:**
- `getCategories(storeId: number): Promise<Category[]>` (tree) + `categoriesQueryOptions(storeId)` + `useCategoriesQuery()` (reads store id itself).
- `flattenCategoryTree(tree: Category[]): { category: Category; depth: number }[]` (depth-first, children in `sort_order` then name) and `getDescendantIds(tree: Category[], categoryId: number): number[]` in `categoryTree.ts` — used by the parent select (excludes self + descendants) and by the products category select/filter (indent label by depth with two non-breaking spaces per level).
- Mutations: create `{ name: string; parent_id: number | null }`, update `{ name?; parent_id?; is_visible? }`, delete; each invalidates `queryKeys.categories(storeId)` and shows a toast ("Category added"/"Category saved"/"Category deleted", description = name); errors → `getActionErrorMessage` in an `Alert`.

- [ ] **Step 1: Write failing tests:** `categoryTree.spec.ts` — flatten order and depth for a 3-level tree; descendants of a root include grandchildren. `Categories.spec.tsx`:
  - `it('lists categories as an indented tree')`;
  - `it('adds a category under a parent')` — dialog Name "Kitenge", Parent "Dresses" → POST body `{ name: 'Kitenge', parent_id: <id> }`, toast "Category added";
  - `it('shows the API message when a category with subcategories can't be deleted')` — 422 `{ errors: { category: ["A category with subcategories can't be deleted."] } }`;
  - `it('is read-only without catalogue.manage')` — no "Add category", inputs disabled.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the screen as the spec's "Categories" section, with the `OptionTypes.jsx` two-column layout (tree card left 260–340px, editor card right). Name saves on blur/Enter only when changed; Parent select and "Visible on storefront" switch save on change.
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(products): categories screen`.

---

### Task 7: Option types screen

**Files:**
- Create: `src/hooks/api/queries/catalogue/useOptionTypesQuery.ts`; mutations in `src/hooks/api/mutations/catalogue/`: `useCreateOptionTypeMutation.ts`, `useUpdateOptionTypeMutation.ts`, `useDeleteOptionTypeMutation.ts`, `useCreateOptionValueMutation.ts`, `useUpdateOptionValueMutation.ts`, `useDeleteOptionValueMutation.ts`; components `src/components/products/OptionTypeList.tsx`, `OptionTypeEditor.tsx`, `OptionValueRow.tsx`, `AddOptionTypeDialog.tsx`; `src/utils/reorder.ts` (+ spec)
- Modify: `src/pages/products/OptionTypesPage.tsx`
- Test: `src/tests/features/OptionTypes/OptionTypes.spec.tsx`

**Interfaces — Produces:**
- `getOptionTypes(storeId): Promise<OptionType[]>`, `optionTypesQueryOptions(storeId)`, `useOptionTypesQuery()`; values sorted by `sort_order` then `id` client-side (the API doesn't guarantee order).
- `moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[]` and `getSortOrderChanges(values: OptionValue[]): { id: number; sort_order: number }[]` (new index as `sort_order`, only values whose `sort_order` differs) in `reorder.ts`.
- Mutations invalidate `queryKeys.optionTypes(storeId)`; toasts per `screens/OptionTypes.jsx` ("Option type added", "Option type deleted", "Value retired" with "<name> · existing variants keep selling", "Value restored", "Value added", "Value deleted", "Option type saved").

- [ ] **Step 1: Write failing tests:** `reorder.spec.ts` (move down/up, changes only for moved items). `OptionTypes.spec.tsx`:
  - `it('adds an option type and selects it')`;
  - `it('adds, renames and deletes an unused value')` — PATCH body `{ value: 'Medium' }`, DELETE called;
  - `it('retires a value used by variants instead of deleting it')` — value with `variants_count: 2` shows "2 variants" and a "Retire — hide from new products" button; click → PATCH `{ is_active: false }`, row shows "Retired";
  - `it('reorders values')` — "Move down" on S → PATCH S `sort_order: 1` and M `sort_order: 0`;
  - `it('only allows deleting an unused type')` — `products_count: 1` → "Delete type" disabled and subtitle "Used by 1 product"; `0` → confirm dialog "Delete Size?" → DELETE;
  - `it('blocks a duplicate value name inline')` — "Already exists".
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** per the spec and `screens/OptionTypes.jsx` (subtitle uses `products_count`: "Used by N product(s)" / "Not used by any product yet"; value usage uses `variants_count`). Empty state when no types: "No option types" / "Add one, such as Size or Colour, to start building variants." Read-only without `catalogue.manage`.
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(products): option types screen`.

---

### Task 8: Products list

**Files:**
- Create: `src/hooks/api/queries/catalogue/useProductsQuery.ts`, `useProductStatusCountsQuery.ts`, `useProductQuery.ts`; `src/hooks/useProductListFilters.ts`; `src/components/products/ProductsTable.tsx`, `ProductThumbnail.tsx`, `Pagination.tsx`, `StockCount.tsx`
- Modify: `src/pages/products/ProductsPage.tsx`, `src/components/layout/Topbar.tsx` (product-name crumb)
- Test: `src/tests/features/Products/ProductsList.spec.tsx`

**Interfaces — Produces:**
- `getProducts(storeId, filters: ProductListFilters): Promise<Paginated<ProductListItem>>` (query params `status`, `search`, `category`, `page`, `per_page`=25), `productsQueryOptions(storeId, filters)`, `useProductsQuery(filters)` (with `placeholderData: keepPreviousData`).
- `useProductStatusCountsQuery({ search?, category? }): { counts: Record<'all' | ProductStatus, number | undefined> }` — four `per_page=1` calls via `useQueries`, keys under `queryKeys.products(storeId)`.
- `getProduct(storeId, productId): Promise<Product>`, `productQueryOptions(storeId, productId)`, `useProductQuery(productId: number)`.
- `useProductListFilters(): { filters: ProductListFilters; setStatus(status?: ProductStatus): void; setSearch(search: string): void; setCategory(category?: number): void; setPage(page: number): void }` — URL search params `status`, `search`, `category`, `page`; changing any filter resets `page`; search writes to the URL 300 ms after typing stops.
- `StockCount({ value: number })` — red (`text-danger-600`, semibold) at ≤ 0, amber (`text-warning-700`, semibold) at 1–3.
- `Pagination({ page, perPage, total, onPageChange })` — "1–25 of 61", Previous/Next buttons; renders nothing when `total <= perPage`.

- [ ] **Step 1: Write failing tests** (`ProductsList.spec.tsx`):
  - `it('lists products with status, variants, available stock and base price')` — row shows "Ankara wrap dress", "Draft", "3", "5", "4,500.00", category name "Dresses" (from the categories query), "Featured" badge when `is_featured`.
  - `it('shows tab counts and filters by status')` — counts from `meta.total`; clicking "Published" requests `status=published` and URL has `?status=published`.
  - `it('searches by name or SKU after typing stops')` — typing "ANK" sends `search=ANK` once.
  - `it('filters by category')`.
  - `it('pages through results')` — `meta.total: 61` → "1–25 of 61"; Next requests `page=2`.
  - `it('shows the empty state with an add button when there are no products')` — "No products yet"; and "No products match" when a filter is set.
  - `it('opens a product when its row is clicked')` → `/products/7`.
  - `it('shows no access when the API answers 403 and keeps the user signed in')` (Review Focus 5) — list 403 → "You don't have access to products."; sidebar still shows the user.
  - `it('hides Add product, Option types and Categories edits without catalogue.manage')` — "Add product" absent.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** per spec "Products list" and `screens/Products.jsx` (header actions: "Categories" and "Option types" secondary buttons, "Add product" primary). Column "Available" (not "On hand"); price column "Price (KES)" using `formatAmount`. Thumbnail: `main_image.url` in a 40px rounded tile (`object-cover`), else neutral tile with `Image` icon. Wire the Topbar `productName` crumb to `useProductQuery` (shows the title once loaded).
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(products): products list`.

---

### Task 9: Add product

**Files:**
- Create: mutations in `src/hooks/api/mutations/catalogue/`: `useCreateProductMutation.ts` (exports `createProduct`), `useCreateVariantMutation.ts` (exports `createVariant`), `useUpdateVariantMutation.ts` (exports `updateVariant`), `useUploadProductImageMutation.ts` (exports `uploadProductImage`), `usePublishProductMutation.ts` (exports `publishProduct`), `src/hooks/api/mutations/inventory/useCreateStockAdjustmentMutation.ts` (exports `createStockAdjustment`); `src/hooks/useCreateProductFlow.ts`; `src/utils/variantCombinations.ts` (+ spec); `src/utils/saveIssues.ts` (+ spec); `src/components/products/ProductNewForm.tsx`, `OptionPicker.tsx`, `NewVariantsTable.tsx`, `PendingImages.tsx`, `PublishChecklist.tsx`; `src/components/products/productNewSchema.ts`
- Modify: `src/pages/products/ProductNewPage.tsx`
- Test: `src/tests/features/Products/ProductNew.spec.tsx`

**Interfaces — Produces:**
- Fetchers: `createProduct(storeId, body: CreateProductBody): Promise<Product>`; `createVariant(storeId, productId, body: { option_value_ids: number[]; price?: string }): Promise<ProductVariant>`; `updateVariant(storeId, productId, variantId, body: { price?: string | null; is_active?: boolean }): Promise<ProductVariant>`; `createStockAdjustment(storeId, body: { variant_id: number; type: 'receipt'; change: number; reason: string }): Promise<{ stock: VariantStock }>`; `uploadProductImage(storeId, productId, file: File, altText: string): Promise<ProductImage>` (multipart `file`, `alt_text`); `publishProduct(storeId, productId): Promise<Product>`. Each hook invalidates `queryKeys.products(storeId)` (and `stockMovements` for stock).
- `CreateProductBody = { title: string; description?: string | null; category_ids: number[]; price?: string | null; is_featured: boolean; option_type_ids: number[] }`.
- `buildVariantCombinations(selected: { optionType: OptionType; valueIds: number[] }[]): { key: string; label: string; optionValueIds: number[] }[]` — cartesian product in option-type order, values in each type's `sort_order`; no types → one `{ key: 'default', label: 'Default', optionValueIds: [] }`; `key` = value ids joined with `-`.
- `SaveIssues = { variants: number; stock: number; images: number; publish: boolean; message: string }` and `formatSaveIssues(issues: SaveIssues): string`, e.g. `{ variants: 2, stock: 1, images: 1, publish: false, message: 'X' }` → `"Saved as a draft, but 2 variants, opening stock for 1 variant and 1 image didn't save: X. Add them below."`; publish-only → `"Saved as a draft, but it couldn't be published: X."`. Singular/plural handled.
- `useCreateProductFlow(): { save(input: ProductNewInput, intent: 'draft' | 'publish'): Promise<void>; isSaving: boolean; fieldErrors?: unknown }` — runs the spec's steps 1–5 in order; step-1 failure is returned for field mapping and stays on the page; a later failure stops, navigates to `buildProductPath(id)` with router state `{ saveIssues: string }`; success navigates there and toasts "Product published" or "Draft saved" (description = name). Opening stock reason is exactly `"Opening stock"`. Price keys are omitted entirely without `pricing.manage`; stock rows are skipped without `inventory.manage`.
- `ProductNewInput = { title: string; description: string; categoryId?: number; basePrice: string; isFeatured: boolean; optionTypeIds: number[]; selectedValueIds: Record<number, number[]>; rows: Record<string, { price: string; stock: string }>; images: File[] }` with Zod `productNewSchema` (draft: title "Give the product a name"; publish adds category "Pick a category" and price "Set a price above 0"; row price must pass `isValidPrice` when filled — "Enter a price like 4500 or 4500.50"; row stock whole number 0–1,000,000 — "Enter a whole number of units"). Files: jpg/png/webp only and ≤ 5 MB, rejected on pick with "Use a JPG, PNG or WebP image up to 5 MB."; at most 20.

- [ ] **Step 1: Write failing tests:** `variantCombinations.spec.ts` (Size S,M × Colour Red → 2 rows "S · Red", "M · Red" in type order; no types → Default). `saveIssues.spec.ts` (the two sentences above; "1 variant" singular). `ProductNew.spec.tsx`:
  - `it('saves a draft with only a name')` — POST body `title`, `is_featured: false`, `option_type_ids: []`, `category_ids: []`; navigates to `/products/<id>`; toast "Draft saved".
  - `it('publishes a product with options, per-variant prices and opening stock')` — pick Size S, M; row M price "5200", stock S "3"; requests in order: POST products (price "4500.00", option_type_ids [Size]), POST variants ×2 (M with price "5200.00", S without `price`), POST stock-adjustments for S `{ type: 'receipt', change: 3, reason: 'Opening stock' }`, POST publish; toast "Product published".
  - `it('uploads picked images after the product is created')` — POST images with `alt_text` = product name, in order.
  - `it('blocks publish until name, category and price are set')` — errors "Pick a category", "Set a price above 0"; no request sent.
  - `it('maps a create 422 onto the field')` — `{ errors: { title: ['…'] } }` shows under Name, stays on the page.
  - `it('lands on the saved draft with a message when a later step fails')` (Review Focus 1) — 2nd variant POST 422 "A variant with these options already exists." → URL `/products/<id>`, alert text `Saved as a draft, but 1 variant … didn't save: A variant with these options already exists.` (whatever `formatSaveIssues` produces for the remaining steps).
  - `it('never sends a price without pricing.manage')` (Review Focus 3) — price inputs disabled with hint "You can't set prices"; Publish disabled; POST body has no `price` key.
  - `it('hides opening stock without inventory.manage')`.
  - `it('disables both save buttons while saving')` — second click sends no second POST.
  - `it('asks before discarding typed changes')` — Discard with a name typed → confirm dialog.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the page per spec "Add product" and `screens/ProductNew.jsx`: Details card (Category select from `flattenCategoryTree`), Images card (`PendingImages`: hidden `<input type="file" multiple accept="image/jpeg,image/png,image/webp">`, tiles via `URL.createObjectURL` revoked on remove/unmount, Cover badge on the first, remove button per tile), Options card (`OptionPicker` with `Chip`s; only active values; types in click order), Variants card (`NewVariantsTable`; SKU column text "Generated on save"; > 200 rows → "That's more than 200 variants. Choose fewer values." and both saves disabled), right column Visibility + `PublishChecklist`. The Detail page reading `location.state.saveIssues` lands in Task 10; until then the test can assert the URL and the message from state via the placeholder page rendering it in an `Alert`.
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(products): add product`.

---

### Task 10: Product detail — details, pricing, inventory, status, save

**Files:**
- Create: mutations `useUpdateProductMutation.ts` (exports `updateProduct`), `useUnpublishProductMutation.ts`, `useArchiveProductMutation.ts` in `src/hooks/api/mutations/catalogue/`; `src/utils/productSummary.ts` (+ spec); `src/components/products/ProductDetailHeader.tsx`, `ProductDetailsCard.tsx`, `VisibilityCard.tsx`, `PricingCard.tsx`, `InventoryCard.tsx`, `ArchiveProductDialog.tsx`, `UnsavedChangesDialog.tsx`, `productDetailSchema.ts`
- Modify: `src/pages/products/ProductDetailPage.tsx`
- Test: `src/tests/features/Products/ProductDetail.spec.tsx`

**Interfaces:**
- Consumes: `useProductQuery`, `publishProduct`, `updateVariant`, `formatMoney`, `useToastContext`, `Dialog`, `getActionErrorMessage`.
- Produces:
  - `summarizeProduct(product: Product): { onHand: number; reserved: number; outOfStockVariants: number; priceRange: string }` — sums over all variants for on hand/reserved; out-of-stock counts active variants with `available <= 0`; price range over active variants' `effective_price` → `"KES 4,500.00"` or `"KES 4,500.00 – 5,200.00"`, `"—"` when none.
  - `updateProduct(storeId, productId, body: Partial<{ title: string; description: string | null; slug: string; category_ids: number[]; is_featured: boolean; price: string | null }>): Promise<Product>`; unpublish/archive fetchers return `Product`. All set `queryKeys.product` data from the response and invalidate `queryKeys.products(storeId)`.
  - The page owns one React Hook Form with `{ title, description, categoryId, slug, isFeatured, basePrice, variantPrices: Record<number, string> }` (default from the product; reset after save). Task 12 renders the variant price inputs bound to `variantPrices`.

- [ ] **Step 1: Write failing tests:** `productSummary.spec.ts` (range with/without overrides; inactive variant excluded from range and out-of-stock count). `ProductDetail.spec.tsx`:
  - `it('shows the product with its status, summary and cards')` — h1 "Ankara wrap dress", "Draft", sub "Dresses · 3 variants · 14 on hand", Inventory card "Held in pending orders" value, Pricing card range.
  - `it('saves only the changed fields')` — change Name → "Save changes" enabled → PATCH body `{ title: 'Ankara maxi dress' }` only; toast "Product saved"; button disabled again.
  - `it('saves a changed variant price after the product')` — `variantPrices` edit (set via the form; the input arrives in Task 12 — test through the base price instead if Task 12 isn't in yet: PATCH `{ price: '4800.00' }`).
  - `it('publishes, unpublishes, archives and restores')` — Draft: Publish → POST publish, toast "Product published", header now shows Unpublish; Archive → dialog "Archive this product?" → POST archive, toast "Product archived"; Archived: only "Restore" → POST unpublish, toast "Product restored to draft".
  - `it('makes an archived product read-only')` (Review Focus 2) — all textboxes, selects and switches disabled; no "Save changes", "Publish", "Archive", "Upload".
  - `it('shows the API message when publishing fails')` — 422 `{ errors: { price: ['A product needs a price to be published.'] } }` → alert with that text.
  - `it('asks before leaving with unsaved changes')` (Review Focus 4) — edit Name, click "Products" back link → dialog "Discard changes?" with "Keep editing" / "Discard"; Keep editing → still on the page; Discard → `/products`.
  - `it('shows the save issues passed from Add product')` — router state `{ saveIssues: 'Saved as a draft, but …' }` → warning `Alert` with that text.
  - `it('never sends a price without pricing.manage')` (Review Focus 3) — base price input disabled; saving a name change sends no `price` key.
  - `it('shows Page not found for a missing product')` — GET 404.
  - `it('keeps the featured switch disabled unless published')`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** per spec "Product detail" and `screens/ProductDetail.jsx`: header actions by status; Details card (Name, Description, Category select, URL handle with prefix "/p/" and hint "Old links keep working after you change it."); right column Visibility (switch disabled unless published, status line copy from the design), Pricing (Base price input with "KES" prefix, then "Price range" row), Inventory (On hand, Held in pending orders, Out of stock variants, the design's low/sold-out line at total on hand ≤ 3). Unsaved guard with `useBlocker` (only when dirty and not saving). Save PATCHes the product (changed fields only; `category_ids: [id]`; `price` only with `pricing.manage`), then each changed variant price (`null` when cleared), then resets the form; failures show `getActionErrorMessage` in an `Alert` above the cards. 403 on load → `NoAccess` "You don't have access to products."; 404 → `NotFoundPage` content.
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(products): product detail with status actions and save`.

---

### Task 11: Product detail — images

**Files:**
- Create: mutations `useDeleteProductImageMutation.ts`, `useSetMainProductImageMutation.ts`, `useReorderProductImagesMutation.ts` in `src/hooks/api/mutations/catalogue/`; `src/components/products/ProductImagesCard.tsx`, `ImageTile.tsx`; `src/utils/imageFiles.ts` (+ spec; shared with Task 9's `PendingImages` — move the type/size check here and import it there)
- Modify: `src/pages/products/ProductDetailPage.tsx`
- Test: `src/tests/features/Products/ProductImages.spec.tsx`

**Interfaces — Produces:**
- `validateImageFile(file: File): string | undefined` (returns "Use a JPG, PNG or WebP image up to 5 MB." or undefined) and `MAX_PRODUCT_IMAGES = 20`.
- Fetchers: `deleteProductImage(storeId, productId, imageId): Promise<void>`, `setMainProductImage(storeId, productId, imageId): Promise<ProductImage>`, `reorderProductImages(storeId, productId, imageIds: number[]): Promise<ProductImage[]>`. All invalidate `queryKeys.product(storeId, productId)` and `queryKeys.products(storeId)`.

- [ ] **Step 1: Write failing tests** (`ProductImages.spec.tsx`):
  - `it('uploads images with the product name as alt text')` — toast "Images uploaded" (description "2 images").
  - `it('rejects a file that is too large or the wrong type')` — no request; message shown.
  - `it('sets an image as the cover')` — POST main; tile shows "Cover".
  - `it('moves an image left')` — PUT order with every image id once in the new order.
  - `it('deletes an image after confirming')` — dialog "Delete this image?" → DELETE.
  - `it('shows the API message when an upload is refused')` — 422 "A product can have at most 20 images.".
  - `it('has no image actions on an archived product')`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the Images card per spec: tiles in `sort_order` (img `object-cover`, 8px radius per design readme), cover marked (2px brand border + "Cover" badge), per-tile icon buttons "Set as cover" (`Star`), "Move left"/"Move right" (`ChevronLeft`/`ChevronRight`, disabled at ends), "Delete image" (`Trash2`); "Upload" button + dashed "Add" tile open the file picker; uploads run one by one and report the first failure; actions apply immediately (not part of Save).
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(products): manage product images`.

---

### Task 12: Product detail — variants and stock history

**Files:**
- Create: `src/hooks/api/queries/inventory/useStockMovementsQuery.ts`; `src/components/products/VariantsTab.tsx`, `AddVariantDialog.tsx`, `StockHistoryTab.tsx`, `src/utils/variantLabel.ts` (+ spec)
- Modify: `src/pages/products/ProductDetailPage.tsx`
- Test: `src/tests/features/Products/ProductVariants.spec.tsx`

**Interfaces:**
- Consumes: `createVariant`, `updateVariant`, `createStockAdjustment` (Task 9), `useOptionTypesQuery` (Task 7), the detail form's `variantPrices` (Task 10).
- Produces: `getVariantLabel(variant: ProductVariant): string` ("S · Red", or "Default" for `is_default`); `getStockMovements(storeId, productId, page): Promise<Paginated<StockMovement>>` + `useStockMovementsQuery(productId, { isEnabled: boolean })` as an infinite query (`per_page=25`, next page while `current_page < last_page`).

- [ ] **Step 1: Write failing tests** (`ProductVariants.spec.tsx`):
  - `it('lists variants with SKU, price, available stock and sellable switch')`.
  - `it('edits a variant price through Save changes')` — input placeholder is the base price; typing "5200" → Save → PATCH variant `{ price: '5200.00' }`; clearing it → `{ price: null }`.
  - `it('turns a variant off immediately')` — switch → PATCH `{ is_active: false }`, toast "Variant updated"; 422 "A published product must keep one active variant. Unpublish it first." shows as an alert and the switch returns to on.
  - `it('adds a variant with opening stock')` — dialog selects per option type (active values only), price "5000", stock "4" → POST variant `{ option_value_ids, price: '5000.00' }` then POST stock-adjustments receipt 4 "Opening stock"; toast "Variant added" (description "M · Red").
  - `it('blocks a combination that already exists')` — "S · Red already exists." and Add disabled; when all combinations exist → "Every combination already exists".
  - `it('has no Add variant for a product without options')`.
  - `it('shows stock history newest first with load more')` — rows: When, Variant label, Type badge ("Receipt"), Change "+3", After, By (actor name or "Order #12"); `meta.last_page: 2` → "Load more" fetches page 2; tab count from `meta.total`; empty "No stock movements yet.".
  - `it('hides stock history without inventory.view and opening stock without inventory.manage')`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** per spec "Product detail" tabbed card and `screens/ProductDetail.jsx`: Tabs (line) "Variants" (count) / "Stock history" (count), "Add variant" button on the Variants tab; Variants table columns Variant (inactive rows at 50% opacity), SKU (`OrderRef plain`), Price (KES) input (`hideLabel`, label "Price for <variant label>"), Available (`StockCount`), Sellable (`Switch` `aria-label="Sellable"`); stock history only requests when its tab is first opened (count comes from that first request). Type badge tones from the design (`sale` neutral, `receipt` success, `return` info, `adjustment` warning). "When" uses relative time under 1 hour ("12 min ago"), otherwise "Oct 18, 11:30" (`Intl.DateTimeFormat('en-KE')`, store-local).
- [ ] **Step 4: Run** typecheck, lint, all tests — PASS.
- [ ] **Step 5: Commit** `feat(products): variants and stock history on product detail`.

---

### Task 13: Docs and end-to-end check

**Files:**
- Modify: `CLAUDE.md` (sections 1, 2, 6, 8, 9, 13, 15: products routes and `RequirePermission`, the `catalogue` hook folders and store-scoped `queryKeys`, the new primitives and `ToastContext`, `formatMoney`, `useAuthedSession`, catalogue fixtures and mock endpoints), `README.md` (screens list)

- [ ] **Step 1: Update docs** with real examples from the code (no invented names).
- [ ] **Step 2: Run** `npm run typecheck && npm run lint && npx prettier --check . && npx vitest run && npm run build` — all pass.
- [ ] **Step 3: End-to-end against the real API** (API branch from Task 1 checked out, throwaway database as in the auth slice — never the user's dev DB or `.env`): sign in; create category "Dresses"; create option type Size (S, M); add product with S/M, a price override and opening stock; publish; upload an image; set cover; edit name; toggle sellable; check stock history; archive and restore. Record what passed in the report.
- [ ] **Step 4: Commit** `docs: products conventions in CLAUDE.md and README`.
