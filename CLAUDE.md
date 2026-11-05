# Commerce ERP Dashboard — Codebase Conventions

A reference guide for developers working on this codebase. Covers architecture, patterns, naming, tooling, and testing conventions observed throughout the project.

> **Design links:** when a claude.ai design link is pasted (e.g. `https://claude.ai/design/p/<uuid>?via=share`),
> open it with the **DesignSync** tool (the claude.ai design MCP tool), not the browser, WebFetch, or the Artifact
> tool. The `<uuid>` in the URL is the `projectId`: call `get_project` to check it, `list_files` to see what's in it,
> and `get_file` to read the files you need.

> **Finishing a branch:** when a feature branch is done and its tests pass, merge it into `main` locally
> (`git checkout main && git merge <branch>`), run the tests on the merged result, then delete the branch. Do not
> push or open a pull request, and do not ask which integration option to use. This applies to this repo and to the
> API repo (`../commerce-erp-api`).

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Component Organization](#2-component-organization)
3. [Naming Conventions](#3-naming-conventions)
4. [Component Patterns](#4-component-patterns)
5. [State Management](#5-state-management)
6. [Custom Hooks](#6-custom-hooks)
7. [Data Fetching](#7-data-fetching)
8. [Routing](#8-routing)
9. [Styling](#9-styling)
10. [TypeScript](#10-typescript)
11. [Form Handling](#11-form-handling)
12. [Error Handling](#12-error-handling)
13. [Testing](#13-testing)
14. [Performance](#14-performance)
15. [API Layer](#15-api-layer)
16. [Environment & Constants](#16-environment--constants)
17. [Import Ordering & Aliasing](#17-import-ordering--aliasing)
18. [Recurring Patterns](#18-recurring-patterns)

---

## 1. Project Architecture

### Top-level `src/` layout

```
src/
├── components/     # UI components: ui/ (primitives), auth/, layout/, overview/, products/, offers/, sales/,
│                   # inventory/, store/, staff/
├── constants/      # Global constants (UPPER_CASE exports), e.g. routes.ts
├── hooks/          # Custom hooks (generic + API-specific)
├── pages/          # Page-level route components (products/ the catalogue screens, offers/ the offers list and
│                   # editor, sales/ orders and deliveries,
│                   # inventory/ the stock list and one variant's stock, store/ delivery zones, staff/ the staff
│                   # and roles screens; the public AcceptInvitePage sits at pages/AcceptInvitePage.tsx)
├── styles/tokens/  # Design-token CSS copied verbatim from the Commerce ERP design system
├── tests/          # Test infra, fixtures, MSW handlers
├── types/          # TypeScript type definitions
└── utils/          # Pure utility functions
```

### Key principles

- **API-first**: All server communication lives in `/hooks/api/`.
- **Domain-organised types**: `/types/` mirrors the API schema structure.
- **Centralised query config**: A single `QueryClient` in `/utils/queryClient.ts`.
- **Session from the server**: the signed-in user comes from `useSession()`, which reads `GET /api/v1/me`. Nothing about auth is kept in browser storage.
- **Store-scoped data**: catalogue, inventory and sales requests go to `/api/v1/stores/{storeId}/…`, built with
  `storePath(storeId, path)` (`/utils/storePath.ts`). The store id always comes from `useAuthedSession().store.id`.

---

## 2. Component Organization

### Folder structure under `src/components/`

```
components/
├── ui/        # Design-system primitives (Button, Input, Card, Alert, Icon, …)
├── auth/      # Sign-in, forgot/reset and accept-invite forms (AcceptInviteForm + acceptInviteSchema for a new
│              # person, AcceptInviteExistingAccount for someone who has an account, AcceptInviteFailure),
│              # ProtectedRoute (+ AuthedSessionContext), GuestRoute, RequirePermission
├── layout/    # AuthLayout and the signed-in AppShell (Sidebar, Topbar)
├── overview/  # The Overview page's cards: NeedsConfirmingCard (pending orders), LowStockCard (3 or fewer left)
├── products/  # Catalogue screens' forms, cards, tables and dialogs (ProductNewForm, ProductDetailForm, …)
├── offers/    # Offers: OffersTable, OfferEditorForm (+ offerSchema) and its cards (OfferDetailsCard,
│              # OfferScheduleCard, OfferTargetsCard, OfferStatusCard), DeleteOfferDialog
├── sales/     # Orders and deliveries: tables, detail cards, header actions and their dialogs (OrdersTable,
│              # OrderHeaderActions, DispatchOrderDialog, DeliveryHeaderActions, DeliveryTrackingDialog, …)
├── inventory/ # Stock screens: StockLevelsTable, VariantTransactionsCard, StockAdjustDialog (+ stockAdjustSchema)
├── store/     # Store settings: DeliveryZonesTable, CheckoutPreviewCard, DeliveryZoneDialog (+ deliveryZoneSchema),
│              # DeleteDeliveryZoneDialog, AddCountryDialog
└── staff/     # Staff and roles: StaffTable, InviteStaffDialog (+ inviteStaffSchema), StaffHeaderActions,
               # StaffActionDialog, StaffProfileCard (+ staffNameSchema), StaffRoleCard, RemoveStaffCard,
               # RolesTable, NewRoleDialog, DeleteRoleDialog, RoleEditorForm, RolePermissionsList (+ roleSchema)
```

### UI primitives

Besides the originals (`Button`, `IconButton`, `Input`, `Card`, `Alert`, `Icon`, `Avatar`, `Spinner`, `EmptyState`,
`TextLink`, `FormErrorMessage`), `components/ui/` holds:

| Primitive                        | Use                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Badge`, `StatusBadge`           | Tone pill; `StatusBadge kind` (product, order, delivery, payment) maps a status to tone and label |
| `Tabs`                           | Tab list (product list status filter, product detail Variants/Stock history)                      |
| `Select`, `Textarea`, `Switch`   | `forwardRef` form controls; bind with `register` like `Input`                                     |
| `Checkbox`                       | `forwardRef` checkbox with a label; bind with `register` (role permission lists)                  |
| `Radio`                          | `forwardRef` radio with `label` and `description`; bind with `register`                           |
| `Timeline`                       | `<ol>` of `TimelineItem` (title, time, meta, note, tone, icon)                                    |
| `LifecycleStepper`               | Step bars with `data-state` done/current/todo; `cancelled` greys the done                         |
| `Chip`                           | Toggle chip with `aria-pressed` (option value picker)                                             |
| `OrderRef`, `CopyButton`         | Monospace reference text (SKU, order reference); copy-to-clipboard button                         |
| `StatCard`                       | Figure tile with label, icon and hint (stock totals)                                              |
| `Pagination`                     | "Showing {from}–{to} of {total}" footer with previous/next (orders, deliveries)                   |
| `DataTable`                      | Generic `DataTable<Row>` with `columns`, `rows`, `getRowKey`, `caption`                           |
| `PageHeader`, `BackLink`         | Page title row with actions; back link above it                                                   |
| `ButtonLink`                     | Router link styled as a small ghost or secondary button (card header and footer navigation)       |
| `Dialog`                         | Modal dialog (confirmations, add category, add variant, …)                                        |
| `Toast` + `ToastContextProvider` | Notifications; call `useToastContext().showToast({ title, tone })`                                |
| `NoAccess`                       | The "no permission" screen rendered by `RequirePermission`                                        |

`StatusBadge` also has a `membership` kind for a staff member's status: `invited`, `active`, and `suspended` (the
API's word), shown as "Deactivated". Pass the API status as-is.

Products and sales sub-components keep form schemas next to the form (`productNewSchema.ts`, `productDetailSchema.ts`,
`cancelOrderSchema.ts`, `markDeliveryFailedSchema.ts`, …).

### Co-location rules

- A component's closely related utilities, sub-components, and tests live in the **same folder**.
- Heavy third-party integrations get a `*Lazy.tsx` sibling that wraps `React.lazy`.

```
components/ui/
├── Button.tsx
└── Button.spec.tsx
```

- No `index.ts` barrel files for components — import directly from the component file.

---

## 3. Naming Conventions

### Files

| Kind                  | Convention                         | Example                            |
| --------------------- | ---------------------------------- | ---------------------------------- |
| React component       | PascalCase                         | `LoginForm.tsx`                    |
| Lazy-loaded component | PascalCase + `Lazy` suffix         | `ChartLazy.tsx`                    |
| Context module        | PascalCase + `Context` suffix      | `FooContext.tsx`                   |
| Hook                  | camelCase, `use` prefix            | `useSession.ts`                    |
| Utility               | camelCase                          | `axiosConfig.ts`, `emailSchema.ts` |
| Type file             | camelCase                          | `session.ts`, `apiErrors.ts`       |
| Constant file         | camelCase                          | `routes.ts`                        |
| Test                  | same name as subject + `.spec.tsx` | `LoginForm.spec.tsx`               |

### Components

- Always **PascalCase**.
- Name reflects role: `AppShell`, `ProtectedRoute`, `ResetPasswordForm`.
- Provider components: `*Provider` (e.g., `FooContextProvider`).

### Hooks

- Always `use*` prefix.
- Query hooks: `use*Query` (e.g., `useMeQuery`).
- Mutation hooks: `use*Mutation` (e.g., `useSignInMutation`, `useSignOutMutation`).
- Helper hooks: descriptive without suffix (e.g., `useSession`, `useSignOut`).

### Types and interfaces

| Pattern       | Example                                  |
| ------------- | ---------------------------------------- |
| Domain entity | `Session`, `User`, `Membership`          |
| Form data     | `LoginFormData`                          |
| API params    | `SignInMutationParams`                   |
| API response  | `User` (unwrapped from `{ data: User }`) |
| Context state | `FooContextState`                        |

### Variables and booleans

- `camelCase` throughout.
- Booleans: `is*`, `has*`, `should*` — e.g., `isSubmitting`, `hasMemberships`, `shouldRetry`.
- Callbacks: `on*` — e.g., `onSubmit`, `onError`, `onSuccess`.

### Full semantic words — no abbreviations

Name things with complete, meaningful words. Avoid abbreviations, contractions, and single letters in identifiers
(variables, parameters, functions, types, files).

- Prefer `configuration` over `config`/`cfg`, `database` over `db`, `transaction` over `tx`, `repository` over `repo`,
  `quoteIdentifier` over `quoteIdent`, `request` over `req`, `error` over `err`, `index` over `i`.
- Loop/callback parameters get descriptive names too: `worker` not `w`, `company` not `c`.
- Established domain acronyms that are clearer than their expansion are fine (e.g., `id`, `url`, `jwt`, `http`, `CLS`,
  `dto`). When in doubt, spell it out.

### No spec screen code names in code

Comments, doc comments, and test names describe the screen or feature ("Post a shift form", "confirm-address
sheet"), never design-doc codes like "C4" / "W13". Those codes only mean something with the design doc open, and a
developer reading the code a year from now won't have it. The same goes for spec section numbers: never
`(spec §11.3)`, say what the rule is ("the street address and coordinates never reach companies").

---

## 4. Component Patterns

### Functional components only

No class components anywhere in the codebase.

### Props

- Inline type in the function signature — no separate exported `Props` type unless reused.
- Destructure in the parameter list.

```typescript
export function FormErrorMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <span id={id} role="alert">{message}</span>;
}
```

### `forwardRef`

Use when the consumer needs a DOM ref. Always set `displayName`.

```typescript
// components/ui/Input.tsx (Button and IconButton follow the same shape)
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, ...props }, ref) => { … },
);

Input.displayName = 'Input';
```

### Composition

- Prefer **custom hooks** over render props for logic extraction.
- Provider nesting in `App.tsx` for cross-cutting concerns.
- Split large components into:
  1. **Container** — hooks, state, event handlers.
  2. **Content** — pure presentation (named `*Content` or `*Render`).
  3. **Sub-components** — focused UI slices.

---

## 5. State Management

Four layers, each with a defined scope:

| Layer            | Library              | Scope                                                             |
| ---------------- | -------------------- | ----------------------------------------------------------------- |
| Server state     | TanStack React Query | API responses, caching, background sync                           |
| App/UI state     | React Context API    | Cross-cutting state only (`ToastContext`, `AuthedSessionContext`) |
| Form state       | React Hook Form      | Per-form field values, validation, submission                     |
| Persistent state | none                 | No auth data in browser storage                                   |

### React Query config (`/src/utils/queryClient.ts`)

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: Infinity, // never auto-stale — invalidate manually
    },
  },
});
```

### Context pattern

Every context module exports a provider and a consumer hook. There are two in the app:
`components/ui/ToastContext.tsx` (`ToastContextProvider`, mounted in `App.tsx`, and `useToastContext`) and
`components/auth/AuthedSessionContext.tsx` (`AuthedSessionContextProvider`, mounted by `ProtectedRoute`, read through
`useAuthedSession()`). The toast one is the shape to copy:

```typescript
// 1. Provider component
export function FooContextProvider({ children }: Props) {
  const value = useMemo(() => ({ … }), [deps]);
  return <FooContext.Provider value={value}>{children}</FooContext.Provider>;
}

// 2. Consumer hook
export const useFooContext = () => useContext(FooContext);

// (The context object itself is not exported — consume only via the hook)
```

---

## 6. Custom Hooks

### Where hooks live

The `api/` tree is organised **by feature subfolder within each layer**. Query and mutation hooks live under
`queries/<feature>/` and `mutations/<feature>/`.

**Current convention (new hooks):** each `use*Query.ts` / `use*Mutation.ts` file is self-contained — it owns its
own `axiosInstance` call (the plain async fetcher function) directly in the same file as the `useQuery`/`useMutation`
wrapper, plus whichever domain type(s) that one round-trip needs. There is no separate `<feature>Api.ts` file for
new features. This trades a little duplication for keeping the network call and the hook that uses it in one place —
easier to read a stack trace or set a breakpoint against. A domain type genuinely shared by several hooks in the
same feature is exported from the hook file that first defines it and imported by the others, rather than hoisted
into a shared file speculatively.

```
src/hooks/
├── api/
│   ├── queryKeys.ts                          # centralised key registry
│   ├── queries/
│   │   ├── auth/useMeQuery.ts                # fetcher + hook, one file
│   │   ├── catalogue/                        # useProductsQuery, useProductQuery, useProductStatusCountsQuery,
│   │   │                                     # useCategoriesQuery, useOptionTypesQuery
│   │   ├── inventory/                        # useStockMovementsQuery (a product's), useVariantStockMovementsQuery,
│   │   │                                     # useStockLevelsQuery, useStockSummaryQuery (tab counts, totals),
│   │   │                                     # useStockLevelQuery (one variant)
│   │   ├── pricing/                          # useOffersQuery, useOfferStatusCountsQuery (tab counts),
│   │   │                                     # useOfferQuery
│   │   ├── staff/                            # useStaffQuery, useStaffMemberQuery, useRolesQuery, useRoleQuery,
│   │   │                                     # usePermissionsQuery, useInvitationQuery (public, by token)
│   │   └── sales/                            # useOrdersQuery, useOrderQuery, useOrderStatusCountsQuery,
│   │                                         # usePendingOrderCountQuery, useSalesPipelineCountsQuery (the
│   │                                         # overview's order and delivery counts), useDeliveriesQuery,
│   │                                         # useDeliveryQuery,
│   │                                         # useCouriersQuery, useDeliveryZonesQuery
│   └── mutations/
│       ├── auth/                             # useSignInMutation, useSignOutMutation,
│       │                                     # useForgotPasswordMutation, useResetPasswordMutation
│       ├── catalogue/                        # products (create, update, publish, unpublish, archive),
│       │                                     # variants, images (upload, delete, set main, reorder),
│       │                                     # categories, option types and option values
│       ├── inventory/useCreateStockAdjustmentMutation.ts
│       ├── pricing/                          # useSaveOfferMutation (create or update), useDeleteOfferMutation
│       ├── staff/                            # invite, resend and revoke an invitation, accept an invitation,
│       │                                     # update, deactivate/reactivate and remove a member, send a
│       │                                     # password reset, save and delete a role
│       └── sales/                            # orders (confirm, cancel, complete, delivery fee, create delivery,
│                                             # dispatch); deliveries (in transit, delivered, failed, retry,
│                                             # returned, add note, update tracking); delivery zones (save,
│                                             # delete, reorder)
├── useSession.ts                             # the session union, derived from useMeQuery
├── useAuthedSession.ts                       # the 'authed' session, for screens under ProtectedRoute
├── useSignOut.ts                             # sign-out action shared by the shell
├── useCreateProductFlow.ts                   # add product: product, variants, stock, images, publish
├── useProductListFilters.ts                  # products list filters kept in the URL search params
├── useOrderListFilters.ts                    # orders list filters (status, search, fee pending, page) in the URL
├── useDeliveryListFilters.ts                 # deliveries list filters kept in the URL search params
├── useOfferListFilters.ts                    # offers list filters (status, search, page) in the URL
└── useStockListFilters.ts                    # stock list filters (low/out status, search, category, page) in the URL
```

`useAuthedSession()` returns the `authed` session that `ProtectedRoute` provides through `AuthedSessionContext`
(`components/auth/AuthedSessionContext.tsx`), and throws outside it, so it is only for components rendered inside
`ProtectedRoute`. Reading the session from the route that decided to render the screen (not from the `me` query)
keeps a screen consistent while a mid-session 401 signs the user out. Store-scoped hooks read `store.id` from it:

```typescript
export function useProductQuery(productId: number) {
  const { store } = useAuthedSession();
  return useQuery({
    ...productQueryOptions(store.id, productId),
    enabled: Number.isInteger(productId) && productId > 0,
  });
}
```

There is no separate `<feature>Api.ts` file. Add a new fetcher next to the hook that uses it.

Naming: `use*Query` / `use*Mutation`. Fetcher functions go through the single configured `axiosInstance`
(`/utils/axiosConfig.ts`) and return domain types — never call `fetch`/`axios` directly from a component.

### Query keys

All keys live in `/hooks/api/queryKeys.ts` as a `const` object. Never inline a key string.

Store-scoped keys are functions that start with `['stores', storeId, …]`, so a store's data never mixes with
another's. `products(storeId)` is the prefix of both the list and detail keys, so invalidating it refreshes every
product query for the store:

```typescript
const products = (storeId: number) => ['stores', storeId, 'products'] as const;

export const queryKeys = {
  me: ['me'],
  products,
  productList: (storeId: number, filters: ProductListFilters) =>
    [...products(storeId), 'list', filters] as const,
  product: (storeId: number, productId: number) =>
    [...products(storeId), 'detail', productId] as const,
  optionTypes: (storeId: number) => ['stores', storeId, 'option-types'] as const,
  categories: (storeId: number) => ['stores', storeId, 'categories'] as const,
  stockMovements: (storeId: number, productId: number) =>
    ['stores', storeId, 'stock-movements', productId] as const,
} as const;
```

Sales keys follow the same shape: `orders(storeId)` prefixes `orderList` and `order`, `deliveries(storeId)` prefixes
`deliveryList` and `delivery`, and `couriers(storeId)` stands alone. Order and delivery mutations write the returned
resource into its detail cache (`storeOrderResponse`, `storeDeliveryResponse`) and invalidate the lists; after a 409
they refetch the detail (`refetchOrderOnConflict`, `refetchDeliveryOnConflict`).

### Hook shape — queries

Each query hook exports a `*QueryOptions()` factory (using the v5 `queryOptions` helper) plus the `use*Query()` hook,
so the options can be reused with `queryClient.fetchQuery` / `prefetchQuery`. Under the current (self-contained)
convention, the fetcher function lives in the same file:

```typescript
// useMeQuery.ts — fetcher + hook, one file
export async function getMe(): Promise<User | null> {
  try {
    const { data } = await axiosInstance.get<{ data: User }>('/api/v1/me');
    return data.data;
  } catch (error) {
    // 401 is a normal answer here: nobody is signed in.
    if (axios.isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

export function meQueryOptions() {
  return queryOptions({ queryKey: queryKeys.me, queryFn: getMe });
}

export function useMeQuery() {
  return useQuery(meQueryOptions());
}
```

### Hook shape — mutations

Look at `useSignInMutation.ts` for the reference shape: `ensureCsrfCookie()`, then the POST, then on success
`queryClient.setQueryData(queryKeys.me, …)` or `invalidateQueries({ queryKey: queryKeys.me })`.

Store-scoped mutations (`useCreateCategoryMutation.ts` is a small example) take `store` from `useAuthedSession()`,
POST to `storePath(store.id, …)`, invalidate the store's key on success and confirm with
`useToastContext().showToast(…)`. CSRF is not re-fetched for these: the cookie already exists once signed in, and a
419 is retried by the interceptor. Product mutations that get the updated product back write it into the detail
cache with `storeProductResponse()` (`useUpdateProductMutation.ts`) instead of refetching.

---

## 7. Data Fetching

### Stack

- **React Query 5** — all data fetching goes through `useQuery` / `useMutation`.
- **Axios** — single configured instance at `/utils/axiosConfig.ts`.
- No direct `fetch` or `useEffect`-based data loading.

### Cookie-session contract

Auth is the Laravel Sanctum cookie session. The dashboard and the API share one origin: in production the build is
served from the API's `public/admin/`, and in development the Vite dev server proxies to the API (see the README).

```typescript
export const axiosInstance = axios.create({
  baseURL: '',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});
```

- Same origin, so `baseURL` is empty and there is no environment variable for the API address.
- `withCredentials` and `withXSRFToken` send the session cookie and the `X-XSRF-TOKEN` header.
- `ensureCsrfCookie()` (`GET /sanctum/csrf-cookie`) runs before login, logout, forgot-password and reset-password.
- A `419` response triggers `ensureCsrfCookie()` and a **single** retry of the original request.
- `401` means signed out. The interceptor calls the handler registered with `setUnauthenticatedHandler`, except for
  `/api/v1/me` and `/logout`, where a 401 is an expected answer.
- `403` means the user lacks a permission. It is not a sign-out; show a permission message.
- There are no tokens, no `Authorization` header and no refresh flow. The session cookie is `HttpOnly`, so the app
  can never read it, and nothing about auth goes in `localStorage` or `sessionStorage`.

---

## 8. Routing

### Library

React Router DOM v6 — `createBrowserRouter` with basename `/`. The build lives in the API's `public/admin/`; pages
are served at the root of the admin host (the API rewrites the app's paths to `index.html`), and only asset URLs carry
the `/admin/` prefix (Vite's `base`).

### Route definition (`/src/Router.tsx`)

```typescript
export const routes: RouteObject[] = [
  {
    element: <App />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: ROUTES.LOGIN, element: <LoginPage /> },
          { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
        ],
      },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                index: true,
                element: <OverviewPage />,
                handle: { crumbs: ['Overview'] } satisfies RouteHandle,
              },
              {
                element: (
                  <RequirePermission slug="orders.view" message="You don't have access to orders." />
                ),
                children: [
                  {
                    path: ROUTES.ORDERS,
                    element: <OrdersPage />,
                    handle: { crumbs: ordersCrumbs } satisfies RouteHandle,
                  },
                  // ROUTES.DELIVERIES (DeliveriesPage) follows the same shape
                  {
                    path: ROUTES.ORDER_DETAIL,
                    element: <OrderDetailRoute />,
                    handle: {
                      crumbs: ordersCrumbs,
                      trailingCrumb: 'orderReference',
                    } satisfies RouteHandle,
                  },
                  {
                    path: ROUTES.DELIVERY_DETAIL,
                    element: <DeliveryDetailRoute />,
                    handle: {
                      crumbs: deliveriesCrumbs,
                      trailingCrumb: 'deliveryReference',
                    } satisfies RouteHandle,
                  },
                ],
              },
              {
                element: (
                  <RequirePermission
                    slug="catalogue.view"
                    message="You don't have access to products."
                  />
                ),
                children: [
                  {
                    path: ROUTES.PRODUCTS,
                    element: <ProductsPage />,
                    handle: { crumbs: productsCrumbs } satisfies RouteHandle,
                  },
                  // ROUTES.PRODUCT_NEW, ROUTES.OPTION_TYPES and ROUTES.CATEGORIES follow the same shape
                  {
                    path: ROUTES.PRODUCT_DETAIL,
                    element: <ProductDetailRoute />,
                    handle: {
                      crumbs: productsCrumbs,
                      trailingCrumb: 'productName',
                    } satisfies RouteHandle,
                  },
                ],
              },
              {
                path: ROUTES.CATCH_ALL,
                element: <NotFoundPage />,
                handle: { crumbs: ['Page not found'] } satisfies RouteHandle,
              },
            ],
          },
        ],
      },
    ],
  },
];
```

### Route constants

```typescript
// src/constants/routes.ts
export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PRODUCTS: '/products',
  PRODUCT_NEW: '/products/new',
  OPTION_TYPES: '/products/option-types',
  CATEGORIES: '/products/categories',
  PRODUCT_DETAIL: '/products/:productId',
  OFFERS: '/offers',
  OFFER_NEW: '/offers/new',
  OFFER_DETAIL: '/offers/:offerId',
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:orderId',
  DELIVERIES: '/deliveries',
  DELIVERY_DETAIL: '/deliveries/:deliveryId',
  STOCK: '/inventory',
  STOCK_VARIANT: '/inventory/:variantId',
  DELIVERY_ZONES: '/delivery-zones',
  STAFF: '/staff',
  STAFF_MEMBER: '/staff/:memberId',
  ROLES: '/roles',
  ROLE_DETAIL: '/roles/:roleId',
  ACCEPT_INVITE: '/accept-invite',
  CATCH_ALL: '*',
} as const;

export function buildProductPath(productId: number): string {
  return `${ROUTES.PRODUCTS}/${productId}`;
}
// buildOfferPath(offerId), buildOrderPath(orderId), buildDeliveryPath(deliveryId), buildStockVariantPath(variantId),
// buildStaffMemberPath(memberId) and buildRolePath(roleId) follow the same shape.
```

Never write a path string inline; use `ROUTES`, and `buildProductPath(id)`, `buildOrderPath(id)` or
`buildDeliveryPath(id)`, `buildStaffMemberPath(id)` or `buildRolePath(id)` for a detail link. There is no sign-up
route. Staff join by invitation: someone with `staff.manage` invites an email address, the person opens the emailed
link at `ROUTES.ACCEPT_INVITE` (`?token=…`), and `AcceptInvitePage` (public, in `AuthLayout`, outside `GuestRoute` and
`ProtectedRoute`) previews the invitation with `useInvitationQuery` and accepts it through
`useAcceptInvitationMutation`. Only a new person (`has_password: false`) sets a name and password there
(`AcceptInviteForm`). Someone who already has an account (`AcceptInviteExistingAccount`) must be signed in as that
person: signed out, they get a sign-in link that returns to the invite; signed in, "Join {store}" accepts with no
fields.

### Breadcrumbs and permission gates

- Every page route under `AppShell` carries a `handle` typed as `RouteHandle` (`/types/routeHandle.ts`): `crumbs`
  for the `Topbar` breadcrumb, and `trailingCrumb` (`'productName'`, `'orderReference'`, `'deliveryReference'` or
  `'stockVariantName'`, `'staffMemberName'`, `'roleName'` or `'offerName'`) to append the loaded product's title,
  the order's reference, "Product · S · Red", the staff member's name, the role's name or the offer's name.
- `RequirePermission` (`components/auth/RequirePermission.tsx`) is a layout route: it renders `<Outlet />` when
  `hasPermission(slug)` and otherwise `NoAccess` with the given message. The products screens sit under
  `catalogue.view` with the fixed copy "You don't have access to products."; the four sales screens (orders list and
  detail, deliveries list and detail) and delivery zones under `orders.view` with "You don't have access to orders."; the two stock
  screens under `inventory.view` with "You don't have access to stock."; the three offer screens under `pricing.view`
  with "You don't have access to offers." (the new offer page also needs `pricing.manage`); the four staff screens (staff list and
  member, roles list and role editor) under `staff.view` with "You don't have access to staff." It never signs the
  user out.
- Finer permissions are checked inside screens with `useAuthedSession().hasPermission(…)`: `catalogue.manage` for
  edits, `pricing.manage` for any `price` field (without it the request never carries a `price` key), and
  `inventory.manage` for stock. `pricing.manage` also gates creating, editing and deleting offers; choosing an
  offer's categories and products reads the catalogue, so without `catalogue.view` the targets are shown read-only. `orders.manage` gates every order and delivery action (confirm, cancel, dispatch,
  complete, delivery fee, delivery moves, notes, tracking edits); without it the sales screens are read-only.
  `fulfilment.manage` gates adding, editing, switching, reordering and deleting delivery zones. `staff.manage` gates
  every staff and role action (invite, resend or revoke an invitation, rename, change role, deactivate, reactivate,
  password reset, remove, create, edit and delete roles); without it those screens are read-only. Which action shows
  in which status comes from `getOrderActions` / `getDeliveryActions` (`/utils/salesRules.ts`).
- `ProductDetailRoute` renders `NotFoundPage` for a non-numeric `:productId` and `ProductDetailPage` otherwise;
  `OrderDetailRoute`, `DeliveryDetailRoute`, `StockVariantRoute`, `StaffMemberRoute` and `RoleDetailRoute` do the
  same for `:orderId`, `:deliveryId`, `:variantId`, `:memberId` and `:roleId`.
  `ProductDetailForm` uses `useBlocker` to ask "Discard changes?" before leaving with unsaved edits.

### Do not mock routing primitives

`useNavigate`, `useLocation`, `useParams` must never be mocked in tests. Use `customRenderAtRoute` and assert on `router.state.location` instead.

### Session and protected routing (store identity from the session, not the URL)

Routes carry no store or tenant identifier. The backend resolves the user from the session cookie, and the app reads
the active store from the session. Never put a store id in a route or trust one from the URL. Inside `ProtectedRoute`, read the session with
`useAuthedSession()` (`/hooks/useAuthedSession.ts`), which reads the authed session from the context
`ProtectedRoute` provides, rather than narrowing `useSession()` again.

`useSession()` (`/hooks/useSession.ts`) derives a discriminated union from `useMeQuery()`:

```typescript
type Session =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'anon' }
  | { status: 'no-store'; user: User }
  | {
      status: 'authed';
      user: User;
      store: StoreSummary;
      roles: string[];
      permissions: string[];
      hasPermission: (slug: string) => boolean;
    };
```

- The active store is the user's **first membership**. Only `useSession` may assume that; everything else reads
  `store`, `roles` and `permissions` from the session.
- `ProtectedRoute` (`components/auth/ProtectedRoute.tsx`) shows a status screen while `loading`, a retry screen on
  `error`, redirects `anon` to `ROUTES.LOGIN`, shows a no-access screen for `no-store`, and renders `<Outlet />`
  inside `AuthedSessionContextProvider` when `authed`.
- `GuestRoute` (`components/auth/GuestRoute.tsx`) owns the post-sign-in redirect: an `authed` user goes to
  `getSafeRedirectPath(?redirect)` (replace), a `no-store` user to `ROUTES.ROOT`, except when the safe redirect is
  `ROUTES.ACCEPT_INVITE`: `GET /me` lists only active memberships, so a re-invited person signs in as `no-store` and
  must get back to the invite to join. `LoginForm` does not navigate itself.
- Auth actions are mutations (`useSignInMutation`, `useSignOutMutation`, `useForgotPasswordMutation`,
  `useResetPasswordMutation`). Sign-in seeds or invalidates the `me` query; sign-out (`useSignOut`) clears the query
  cache and navigates to login only after the server confirms (204) or reports the session already gone (401); on any
  other failure the user stays put and sees "Couldn't sign out. Try again." The 401 handler drops every cached query
  except `me` and sets `me` to `null`, so mounted observers stay attached.

---

## 9. Styling

### Primary: Tailwind CSS 3

All styling is applied via Tailwind utility classes directly on JSX elements.

### Design system

Design tokens come from the Commerce ERP design system. `src/styles/tokens/*.css` are verbatim copies of the
design-system token files (colour, spacing, typography, effects); do not hand-edit them, and they are excluded from
Prettier in `.prettierignore`. `tailwind.config.ts` maps those tokens into the Tailwind theme, so components use
semantic classes rather than raw values. Primitives live in `src/components/ui/` (see the table in §2). Icons are Lucide icons rendered through the `Icon`
primitive. Fonts come from the `@fontsource`
packages (`@fontsource-variable/plus-jakarta-sans`, `@fontsource/jetbrains-mono`), not a CDN.

### Money

Prices from the API are `Money` (`{ amount: "1500.00", currency: "KES" }`) or `null`. Display them with
`formatMoney(money)` from `/utils/money.ts` (`KES 4,500.00`, or `—` for `null`); `formatAmount` gives the number
alone, for columns whose header carries the unit ("Price (KES)"). Send prices as two-decimal strings: validate with
`isValidPrice` and convert with `toMoneyInput` (`"4500"` → `"4500.00"`).

### Class name utilities

| Library                    | Usage                        |
| -------------------------- | ---------------------------- |
| `clsx` + `tailwind-merge`  | `cn()` in `/utils/cn.ts`     |
| `class-variance-authority` | Typed component variant APIs |

No CSS Modules, Styled Components, or Emotion. No inline `style` objects except where Tailwind cannot reach.

---

## 10. TypeScript

### tsconfig

Key settings:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### Type file layout

```
src/types/
├── apiErrors.ts
├── catalogue.ts     # Money, Product, ProductListItem, ProductVariant, ProductImage, OptionType, Category,
│                    # StockMovement, Paginated<T>
├── routeHandle.ts   # RouteHandle for route breadcrumbs
├── pricing.ts       # OfferType, OfferStatus, Offer (with its product, variant and category targets)
├── sales.ts         # Order, OrderListItem, OrderLine, Delivery, DeliveryListItem, DeliveryTimelineEvent, Courier
├── staff.ts         # StaffStatus, StaffRoleSummary, StaffInvitation, StaffMember, Role, RoleMember, RoleDetail,
│                    # Permission, InvitationPreview
└── session.ts
```

### Discriminated unions for API responses

```typescript
export type Session =
  { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: User /* … */ };
```

### `as const` for constant objects

```typescript
export const ROUTES = { ROOT: '/', … } as const;
export const queryKeys = { me: ['me'] } as const;
```

### Avoid `any`

Use `unknown` at system boundaries and narrow with type guards. `strict` is on.

---

## 11. Form Handling

### Stack

- **React Hook Form v7** — form state, registration, and submission.
- **Zod** — schema-based validation via `@hookform/resolvers/zod`.

### Setup pattern

```typescript
const {
  register,
  handleSubmit,
  setError,
  formState: { errors },
} = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), mode: 'onSubmit' });
```

### Input binding

```typescript
// Simple native input
<Input label="Email" {...register('email')} />

// Switch, Select and Textarea forward their ref, so they bind with register too
<Switch label="Featured on homepage" {...register('isFeatured')} />

// A non-native input with no ref (a custom picker) would use <Controller name control render />.
// None exists yet: the option picker in the add-product form uses useFormContext with useWatch/setValue.
```

### Error display

Always use the shared `FormErrorMessage` component. Never write inline error JSX. Validation messages come from
the Zod schema; server validation messages (the API's 422 body) are mapped with `getFieldError` and shown as-is.

```typescript
<FormErrorMessage id="email-error" message={errors.email?.message} />
```

### Nested forms

`FormProvider` wraps the form tree; all inputs access state via `useFormContext()` — no prop drilling of `register` / `control`.
`ProductNewForm` and `ProductDetailForm` are the examples: their cards (`PricingCard`, `VisibilityCard`,
`OptionPicker`, `PublishChecklist`, …) call `useFormContext<ProductNewInput>()` or `useFormContext<ProductDetailInput>()`.

---

## 12. Error Handling

### Error boundaries

Not used so far. Render failures surface through React's default behaviour; add a boundary when a screen needs one.

### API error handling

- Mutation callbacks and `onError` receive `AxiosError`; branch with the helpers in `/utils/apiErrors.ts`
  (`isStatus`, `getFieldError`, `getRetryAfterSeconds`, `getTooManyRequestsMessage`, `getFirstValidationMessage`,
  `getActionErrorMessage`).
- `getActionErrorMessage(error)` is the message for a failed action: a 403 gives the fixed "You don't have permission
  to do that.", a 422 gives the API's first validation message as-is, anything else "Something went wrong. Try
  again." It is shown where the action happened (the dialog, the card or a toast).
- Error shapes are defined in `/types/apiErrors.ts`.
- `401` is handled once, centrally, by the Axios interceptor (see §7). `419` is retried once there.
- Never reveal whether an email exists. Show the API's single login `422` message as-is, and show the same
  confirmation for every forgot-password `204`.

### Error logging

None. No Datadog, LogRocket, Flagsmith or other third-party tracking is used.

---

## 13. Testing

### Stack

- **Vitest** (test runner, globals enabled, `jsdom` environment, 20 s timeout)
- **@testing-library/react** + **@testing-library/user-event**
- **@testing-library/jest-dom** (DOM matchers)
- **MSW** (Mock Service Worker) for network interception

### Test file locations

| Kind                  | Location                         | Example                                   |
| --------------------- | -------------------------------- | ----------------------------------------- |
| Feature / integration | `src/tests/features/<Feature>/`  | `src/tests/features/Login/Login.spec.tsx` |
| Hook unit test        | Co-located next to the hook      | `useSession.spec.tsx`                     |
| Component render test | Co-located next to the component | `Button.spec.tsx`                         |

### Custom render helpers (`src/tests/customRender.tsx`)

| Helper                         | Use                                                                    |
| ------------------------------ | ---------------------------------------------------------------------- |
| `customRenderAtRoute({ url })` | Full app: memory router over the real routes, React Query              |
| `customRender(children)`       | React Query only, no routing                                           |
| `buildTestQueryClient()`       | A query client with the app's defaults, for tests that build their own |

There is no router basename in tests (the app basename is `/`). Pass `url` as the app path: `'/'`, `'/login'`,
`'/reset-password?token=…'`, `'/products/12'`. Fixtures live in `src/tests/fixtures/`: `buildUserFixture` (a `User`
with a membership and the catalogue, pricing, inventory and orders permissions) in `user.ts`, and in `catalogue.ts`
`buildProductFixture`, `buildProductListItemFixture`, `buildVariantFixture`, `buildProductImageFixture`,
`buildOptionTypeFixture`, `buildCategoryFixture`, `buildStockMovementFixture`, `buildVariantStockLevelFixture`, `buildMoney` and `buildPaginated`; in
`sales.ts` `buildOrderFixture`, `buildOrderListItemFixture`, `buildOrderLineFixture`, `buildOrderDeliveryFixture`,
`buildDeliveryFixture`, `buildDeliveryListItemFixture`, `buildDeliveryEventFixture` and `buildCourierFixture`; in `staff.ts`
`buildStaffMemberFixture`, `buildRoleFixture`, `buildRoleDetailFixture`, `buildPermissionFixture` and
`buildInvitationPreviewFixture`; in `pricing.ts` `buildOfferFixture` (the default `buildUserFixture` also holds `staff.view` and `staff.manage`).
The MSW endpoint paths are in `src/tests/mocks/endpoints.ts` (`mockEndpoints`); the store-scoped ones use a
`:storeId` parameter, e.g. `mockEndpoints.product` is `/api/v1/stores/:storeId/products/:productId`.

### Waiting for hydration

`useSession` starts as `loading`, so wait for a sentinel before asserting.

```typescript
server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
const { router } = customRenderAtRoute({ url: '/' });
expect(await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
```

### Navigation assertions

```typescript
await waitFor(() => {
  expect(router.state.location.pathname).toBe('/login');
});
```

### MSW overrides

```typescript
it('shows the sign-in error', async () => {
  server.use(
    http.post(mockEndpoints.login, () =>
      HttpResponse.json(
        { message: 'Invalid.', errors: { email: ['These credentials do not match.'] } },
        { status: 422 },
      ),
    ),
  );
  // …
});
```

### What must not be mocked

- `useNavigate`, `useLocation`, `useParams` — use `customRenderAtRoute` instead.
- `useSession`, `useMeQuery` and other data hooks — let MSW populate them.
- `axiosInstance` — intercept at the network with MSW.

---

## 14. Performance

### Lazy loading

Heavy leaf components get a `*Lazy.tsx` sibling using `React.lazy`. None exist yet.

### Memoisation

- `useMemo` — computed context values and expensive selectors.
- `useCallback` — callbacks passed as stable references into children.
- `React.memo` — not widely used; prefer fixing prop identity via hooks.

### React Query cache defaults

`staleTime: Infinity` means data never goes stale automatically. Freshness is managed by explicit `queryClient.invalidateQueries()` calls after mutations.

Sales is the exception, because orders arrive from the storefront:

- The orders list, its tab counts and the sidebar's pending count poll every 60 s
  (`ORDERS_REFETCH_INTERVAL_MILLISECONDS`) and use `refetchOnWindowFocus: 'always'`.
- The order and delivery details use `refetchOnWindowFocus: 'always'` and `refetchOnMount: 'always'`, so opening a
  cached detail loads it again.
- Use `'always'`, not `true`: with `staleTime: Infinity`, `true` never refetches because the data is never stale.
- A mutation that stores its response (`storeOrderResponse`, `storeDeliveryResponse`) first cancels the detail's
  in-flight reload so an older answer can't land on top of it.
- Stock moves with those orders, so the stock list, its summary and a variant's stock use `refetchOnMount: 'always'`
  and `refetchOnWindowFocus: 'always'`; order moves (`invalidateStockQueries`) and stock adjustments invalidate
  `stockLevels(storeId)`.

---

## 15. API Layer

### Structure

```
hooks/api/
├── queries/           # One file per query (wraps useQuery) — fetcher lives in the same file (see §6)
├── mutations/         # One file per mutation (wraps useMutation) — same
└── queryKeys.ts       # Centralised key registry

utils/
├── axiosConfig.ts     # axiosInstance, ensureCsrfCookie, setUnauthenticatedHandler, interceptors
├── apiErrors.ts       # status and field-error helpers
├── storePath.ts       # storePath(storeId, path) → /api/v1/stores/{storeId}{path}
├── money.ts           # formatMoney, formatAmount, isValidPrice, toMoneyInput
├── staffCache.ts      # invalidateTeamQueries, storeStaffMemberResponse, refreshAfterStaffMemberGone
├── offers.ts        # getOfferStatus, describeOfferTiming, formatOfferDiscount, summariseOfferTargets,
│                    # toDateTimeLocal / fromDateTimeLocal
├── rolePermissions.ts # togglePermission (keeps a manage permission's view one), countVisiblePermissions
└── queryClient.ts     # the single QueryClient

constants/
└── permissions.ts     # PERMISSION_GROUPS, HIDDEN_PERMISSION_SLUGS, PERMISSION_DEPENDENCIES, OWNER_ROLE_SLUG
```

Catalogue endpoints are store-scoped (`storePath(store.id, '/products')`, `'/categories'`, `'/option-types'`);
inventory ones too (`'/stock-movements'` filtered by `product_id` or `variant_id` and `type`, `'/stock-adjustments'`,
`'/stock-levels'` and `'/stock-levels/{variantId}'`). The stock list asks for a status as an available range
(`getAvailableRange`, `/utils/stockStatus.ts`); "low" is 1 to `LOW_STOCK_THRESHOLD` (`/constants/stock.ts`, 3), the
same rule `getStockStatus` and `StockCount` use. Lists come back as
`Paginated<T>` (`/types/catalogue.ts`).

Offers are store-scoped (`'/offers'`, `'/offers/{offerId}'`). The list filters by `status` (`live`, `scheduled`,
`inactive`, `ended`) and `q`; there is no counts endpoint, so the tab counts are `per_page=1` requests. Offer times
come back as UTC; the editor shows them in the browser's time zone and sends them as ISO instants with an offset,
because a time without one is read in the store's time zone. Saves never send `variant_ids`, so variant targets set
elsewhere are kept. The store's minimum price is not exposed, so the sale-price floor is the API's 422 message.

Staff endpoints are store-scoped too: `'/staff'` (members, `/staff/invitations`, `/staff/{memberId}` with its
`/deactivate`, `/reactivate`, `/password-reset` and `/invitation` actions), `'/roles'` and `'/permissions'`. The
invitation endpoints are public and not store-scoped: `GET /api/v1/invitations/{token}` previews an invitation and
`POST /api/v1/invitations/{token}/accept` accepts it, with the token in the path and no `storePath`. A new person's
accept sends `name`, `password` and `password_confirmation` and needs no session; an existing account's accept needs a
signed-in session as the invited person and sends no body. Member mutations that get a member back write it with
`storeStaffMemberResponse`; every team change refreshes the staff and roles lists with `invalidateTeamQueries`, and a
rename of the signed-in person also invalidates `me` so the sidebar shows the new name.

### Axios instance features

See §7 for the cookie-session contract (same origin, `withCredentials` and `withXSRFToken`, `ensureCsrfCookie`,
one 419 retry, 401 and 403 meaning). The API wraps resources as `{ data: … }`; fetchers unwrap that and return
domain types.

### API function shape

```typescript
// returns a strongly-typed result; a 401 from /me is "nobody signed in", not an error
export async function getMe(): Promise<User | null> { … }
```

---

## 16. Environment & Constants

### Environment variables

None are needed. The dashboard and the API share one origin, so there is no API address to configure. Vite's dev
proxy target (`http://localhost:8000`) lives in `vite.config.ts`.

### Constants files

Use `UPPER_CASE` for exported constant values, `camelCase` for the file name:

```typescript
// src/constants/routes.ts
export const ROUTES = { ROOT: '/', … } as const;
```

---

## 17. Import Ordering & Aliasing

### Path alias

`@/*` maps to `./src/*`. Use it for every non-relative import.

```typescript
import { useMeQuery } from '@/hooks/api/queries/auth/useMeQuery';
import { type User } from '@/types/session';
```

### Import order (top to bottom)

1. React and React Router DOM
2. Third-party libraries
3. `@/types/…`
4. `@/hooks/…`
5. `@/components/…`
6. `@/utils/…`
7. `@/constants/…`
8. Relative imports (`./`, `../`)

Type-only imports (`import { type Foo }`) are grouped with their corresponding runtime imports, not separated.

---

## 18. Recurring Patterns

### Context provider pattern

Every context module follows this shape (`components/ui/ToastContext.tsx` is the example):

```typescript
type FooContextState = { … };

const FooContext = createContext<FooContextState>({ … /* defaults */ });

export function FooContextProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ … }), [deps]);
  return <FooContext.Provider value={value}>{children}</FooContext.Provider>;
}

export const useFooContext = () => useContext(FooContext);
```

The raw context object is never exported. Because the module exports a hook next to the component, the hook line
carries `// eslint-disable-next-line react-refresh/only-export-components`.

### Page composition pattern

1. `*Page.tsx` in `src/pages/` — route entry, picks the layout and the form or content.
2. Feature components in `src/components/<area>/` — forms and other stateful pieces.
3. Primitives in `src/components/ui/` — presentational only.

### Form input pattern

Every form uses React Hook Form with a Zod schema, shared UI primitives and `FormErrorMessage`:

```typescript
const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  mode: 'onSubmit',
});

<Input label="Email" {...register('email')} aria-describedby="email-error" />
<FormErrorMessage id="email-error" message={errors.email?.message} />
```

### Query / mutation split

- Each **query/mutation hook file** owns its own network call — the plain async fetcher function is defined in the
  same file as the hook, not in a separate API-functions file (see §6).
- **Query hooks** wrap `useQuery` and pass the query options object.
- **Mutation hooks** wrap `useMutation`, call `invalidateQueries` on success, and handle typed errors.

### Discriminated union responses

API responses and state with multiple possible shapes use discriminated unions rather than optional fields. `Session` is the main example (see §8).

```typescript
type Session =
  { status: 'loading' } | { status: 'anon' } | { status: 'authed'; user: User /* … */ };
```

---

## Build & Tooling Reference

| Tool             | Version | Purpose                            |
| ---------------- | ------- | ---------------------------------- |
| Vite             | 8.x     | Build, dev server and `/api` proxy |
| TypeScript       | 5.9     | Static typing                      |
| React            | 19      | UI                                 |
| Tailwind CSS     | 3.4     | Utility-first styling              |
| React Query      | 5.x     | Server state                       |
| React Router DOM | 6.x     | Routing                            |
| React Hook Form  | 7.x     | Form state                         |
| Zod              | 3.x     | Schema validation                  |
| Vitest           | 4.x     | Test runner                        |
| MSW              | 2.x     | API mocking in tests               |
| ESLint           | 10.x    | Linting                            |
| Prettier         | 3.x     | Formatting (`.prettierrc`)         |

Scripts: `npm run dev | test | typecheck | lint | build | build:api` (see `README.md`). `build:api` writes the
production build into the API's `public/admin/`.
