# EPR Dashboard App — Codebase Conventions

A reference guide for developers working on this codebase. Covers architecture, patterns, naming, tooling, and testing conventions observed throughout the project.

> **Design links:** when a claude.ai design link is pasted (e.g. `https://claude.ai/design/p/<uuid>?via=share`),
> open it with the **DesignSync** tool (the claude.ai design MCP tool), not the browser, WebFetch, or the Artifact
> tool. The `<uuid>` in the URL is the `projectId`: call `get_project` to check it, `list_files` to see what's in it,
> and `get_file` to read the files you need.

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
├── components/     # UI components organised by feature area
├── context/        # React Context providers
├── hooks/          # Custom hooks (generic + API-specific)
├── types/          # TypeScript type definitions (domain-organised)
├── utils/          # Pure utility functions
├── pages/          # Page-level route components
├── i18n/           # i18next translations and setup
├── constants/      # Global constants (UPPER_CASE exports)
├── tests/          # Test infra, fixtures, MSW handlers
├── definitions/    # Ambient type definitions
└── vendor/         # Pinned third-party code
```

### Key principles

- **API-first**: All server communication lives in `/hooks/api/`.
- **Domain-organised types**: `/types/` mirrors the API schema structure.
- **Centralised query config**: A single `QueryClient` in `/utils/queryClient.ts`.
- **Context for cross-cutting state**: Theme, session, page navigation, and messaging each have their own context module.

---

## 2. Component Organization

### Folder structure under `src/components/`

```
components/
├── views/                  # Feature-specific view types (Form, Table, Report, …)
├── layout/                 # Page and app-shell layout wrappers
├── errors/                 # Error boundary and fallback UI
├── custom-code/            # Custom code execution sandbox
├── main-navigation/        # Top-level navigation
├── skeletons/              # Loading skeleton components
├── knack-date-picker/      # Encapsulated date-picker library
├── knack-internals/        # Builder ↔ app iframe bridge
└── [root level]            # Shared components (AppLogo, Breadcrumbs, …)
```

### Co-location rules

- A component's closely related utilities, sub-components, and tests live in the **same folder**.
- Deep input components nest their transformers in a `transformers/` subfolder.
- Heavy third-party integrations get a `*Lazy.tsx` sibling that wraps `React.lazy`.

```
views/form/inputs/date-time/
├── DateTimeInput.tsx
├── DateTimeInput.spec.tsx
└── transformers/
    ├── DateTimeFormatToLuxonFormat.ts
    └── DateTimeFormatToLuxonFormat.spec.ts
```

- No `index.ts` barrel files for components — import directly from the component file.

---

## 3. Naming Conventions

### Files

| Kind                  | Convention                                              | Example                                  |
| --------------------- | ------------------------------------------------------- | ---------------------------------------- |
| React component       | PascalCase                                              | `LoginFormContent.tsx`                   |
| Lazy-loaded component | PascalCase + `Lazy` suffix                              | `AddressGoogleAutocompleteInputLazy.tsx` |
| Context module        | PascalCase + `Context` suffix                           | `PageContext.tsx`                        |
| Hook                  | camelCase, `use` prefix                                 | `useContainerQuery.ts`                   |
| Utility               | camelCase                                               | `axiosConfig.ts`, `tokenUtils.ts`        |
| Type file             | PascalCase for schema types, camelCase for domain types | `LiveAppPage.ts`, `session.ts`           |
| Constant file         | camelCase                                               | `routes.ts`                              |
| Test                  | same name as subject + `.spec.tsx`                      | `LoginForm.spec.tsx`                     |

### Components

- Always **PascalCase**.
- Name reflects role: `PageLayout`, `RouterErrorBoundary`, `ResetPasswordWrapper`.
- Provider components: `*Provider` (e.g., `PageContextProvider`).

### Hooks

- Always `use*` prefix.
- Query hooks: `use*Query` (e.g., `useApplicationQuery`, `useTableQuery`).
- Mutation hooks: `use*Mutation` (e.g., `useAddRecordMutation`, `useSignInMutation`).
- Helper hooks: descriptive without suffix (e.g., `useMenuLinkPagePath`, `useCriteriaRules`).

### Types and interfaces

| Pattern       | Example                                     |
| ------------- | ------------------------------------------- |
| Domain entity | `Session`, `LiveAppPage`                    |
| Form data     | `LoginFormData`                             |
| API params    | `SignInMutationParams`                      |
| API response  | `SignInResponse`                            |
| Context state | `PageContextState`, `MessagingContextValue` |

### Variables and booleans

- `camelCase` throughout.
- Booleans: `is*`, `has*`, `should*` — e.g., `isSubmitting`, `hasSignupButtons`, `shouldUseBearerAuth`.
- Callbacks: `on*` — e.g., `onSubmit`, `onPlaceSelected`, `onError`.

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
export function ShortTextInput({ input, isReadOnly }: {
  input: FormInput;
  isReadOnly: boolean;
}) { … }
```

### `forwardRef`

Use when the consumer needs a DOM ref. Always set `displayName`.

```typescript
export const AddressGoogleAutocompleteInput = forwardRef<
  HTMLInputElement,
  AddressEditInputProps
>(({ onPlaceSelected, ...props }, ref) => { … });

AddressGoogleAutocompleteInput.displayName = 'AddressGoogleAutocompleteInput';
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

| Layer            | Library              | Scope                                         |
| ---------------- | -------------------- | --------------------------------------------- |
| Server state     | TanStack React Query | API responses, caching, background sync       |
| App/UI state     | React Context API    | Session, theme, page nav, messaging           |
| Form state       | React Hook Form      | Per-form field values, validation, submission |
| Persistent state | `localStorage`       | Refresh token (keyed by app ID)               |

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

Every context module exports exactly three things:

```typescript
// 1. Provider component
export function PageContextProvider({ children }: Props) {
  const value = useMemo(() => ({ … }), [deps]);
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

// 2. Consumer hook
export const usePageContext = () => useContext(PageContext);

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
│   ├── queryKeys.ts           # centralised key registry
│   ├── auth/                  # legacy split-pattern feature (grandfathered, see below)
│   │   └── authApi.ts         #   signUp, signIn, getMe, refresh (over axiosInstance)
│   ├── workers/
│   │   └── workersApi.ts
│   ├── queries/
│   │   ├── auth/useMeQuery.ts
│   │   ├── workers/useWorkersQuery.ts
│   │   └── applications/useApplicationChecklistQuery.ts   # new convention: fetcher + hook, one file
│   └── mutations/
│       ├── auth/              # useSignUpMutation, useSignInMutation, useSignOutMutation
│       └── applications/useStartReviewMutation.ts          # new convention: fetcher + hook, one file
├── helpers/                   # helper hooks co-located with their feature
└── [root]                     # generic reusable hooks (useSession, useDebounce, …)
```

**Legacy split pattern (grandfathered, do not extend):** some existing features (`auth/authApi.ts`,
`workers/workersApi.ts`, and the pre-existing `applications/applicationsApi.ts` functions —
`listShiftApplications`, `acceptApplication`, `rejectApplication`) still keep plain API functions in a separate
`api/<feature>/<feature>Api.ts` file, imported by their query/mutation hook. These are not being migrated
proactively — leave them as-is unless you're already rewriting that specific hook for another reason. Do not add
new functions to an existing `<feature>Api.ts` file; new hooks (even within an otherwise-legacy feature) follow the
self-contained convention above.

Naming: `use*Query` / `use*Mutation`. Fetcher functions go through the single configured `axiosInstance`
(`/utils/axiosConfig.ts`) and return domain types — never call `fetch`/`axios` directly from a component.

### Query keys

All keys live in `/hooks/api/queryKeys.ts` as a `const` object. Never inline a key string.

```typescript
export const queryKeys = {
  application: "application",
  session: "session",
  table: "table",
  auth: { session: "session" },
} as const;
```

### Hook shape — queries

Each query hook exports a `*QueryOptions()` factory (using the v5 `queryOptions` helper) plus the `use*Query()` hook,
so the options can be reused with `queryClient.fetchQuery` / `prefetchQuery`. Under the current (self-contained)
convention, the fetcher function lives in the same file:

```typescript
// useApplicationChecklistQuery.ts — fetcher + hook, one file
async function getApplicationChecklist(
  applicationId: string,
): Promise<ApplicationChecklist> {
  const { data } = await axiosInstance.get(
    `/applications/${applicationId}/checklist`,
  );
  return data;
}

export function applicationChecklistQueryOptions(applicationId: string) {
  return queryOptions({
    queryKey: queryKeys.applications.checklist(applicationId),
    queryFn: () => getApplicationChecklist(applicationId),
  });
}

export function useApplicationChecklistQuery(applicationId: string) {
  return useQuery(applicationChecklistQueryOptions(applicationId));
}
```

(The legacy split pattern looks the same except `queryFn` imports its fetcher — e.g. `getMe` — from a separate
`<feature>Api.ts` file instead of defining it locally; see `useMeQuery.ts` for an existing example.)

### Hook shape — mutations

```typescript
// useStartReviewMutation.ts — fetcher + hook, one file
async function startReview(applicationId: string) {
  const { data } = await axiosInstance.post(
    `/applications/${applicationId}/start-review`,
  );
  return data;
}

export function useStartReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.viewData] });
    },
  });
}
```

Additional local state (e.g., 2FA step) is added to the mutation hook and spread-merged with the result object.

---

## 7. Data Fetching

### Stack

- **React Query 5** — all data fetching goes through `useQuery` / `useMutation`.
- **Axios** — single configured instance at `/utils/axiosConfig.ts`.
- No direct `fetch` or `useEffect`-based data loading.

### Axios instance

```typescript
export const axiosInstance = axios.create({
  baseURL: import.meta.env.PUBLIC_API_URL,
  headers: {
    'x-knack-rest-api-key': 'renderer',
    'x-knack-live-app-version': 'v4',
    …getClientTimezoneHttpHeader()
  }
});
```

**Request interceptor** adds auth headers (Bearer token for custom-domain / embed scenarios).

**Response interceptors** handle:

- `401` — classify terminal vs. recoverable; terminal errors redirect to fallback URL.
- `403` — clear stored tokens and sign out.
- Network errors — log to LogRocket with classification.

### Authentication tokens

| Token               | Storage        | Reason                        |
| ------------------- | -------------- | ----------------------------- |
| Auth (access) token | Memory only    | Cannot be exfiltrated via XSS |
| Refresh token       | `localStorage` | Survives page reload          |

Concrete contract (see `/utils/tokenUtils.ts` + `/utils/axiosConfig.ts`): the request interceptor attaches the
in-memory access token; the response interceptor, on `401`, calls `/auth/refresh` **once** — guarded by a single
shared in-flight refresh promise so concurrent 401s don't stampede — then retries the original request; on refresh
failure it clears tokens (session drops to anonymous); `403` clears tokens. The access token never goes to
`localStorage`.

---

## 8. Routing

### Library

React Router DOM v6 — `createBrowserRouter` with a `basename` derived from the account/app slugs.

### Route definition (`/src/Router.tsx`)

```typescript
export const routes: RouteObject[] = [
  {
    element: <RouterErrorBoundary><App /></RouterErrorBoundary>,
    children: [
      {
        element: <PageLayout />,
        children: [
          { path: ROUTES.CATCH_ALL, element: <Page /> },
          { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordWrapper /> }
        ]
      }
    ]
  }
];
```

### Route constants

```typescript
// src/constants/routes.ts
export const ROUTES = {
  ROOT: "/",
  RESET_PASSWORD: "/knack-password/reset/:token",
  CATCH_ALL: "*",
} as const;
```

### Page navigation

Dynamic page slugs are not registered as explicit routes. `PageContext` reads URL segments from `useLocation` and resolves the current page via application metadata returned by the API.

### Do not mock routing primitives

`useNavigate`, `useLocation`, `useParams` must never be mocked in tests. Use `customRenderAtRoute` and assert on `router.state.location` instead.

### Session & protected routing (tenant identity from the token, not the URL)

Routes are plain app paths (`/login`, `/signup`, `/dashboard`) — **no company/tenant identifier in the URL**. The
access token carries the tenant (`companyId`); the backend resolves it from the token. Never put a tenant id in a
route or trust one from the URL.

- **Session source of truth:** `useSession()` (`/hooks/useSession.ts`) derives `{ status: 'loading'|'authed'|'anon',
user, company }` from `useMeQuery()`. Read identity (current company/user) from it — don't prop-drill or hardcode.
- **Guarding:** a `ProtectedRoute` reads `useSession()` and redirects to `/login` when `anon`, renders a spinner while
  `loading`, and `<Outlet/>` when `authed`. `LoginRoute`/`SignupRoute` redirect to `/dashboard` when already authed.
- **Auth actions** are mutations (`useSignUpMutation` / `useSignInMutation` / `useSignOutMutation`): on success they
  store tokens and invalidate/seed the `me` query; sign-out clears tokens + `queryClient.clear()`.

---

## 9. Styling

### Primary: Tailwind CSS 3

All styling is applied via Tailwind utility classes directly on JSX elements.

```typescript
<div className="mb-8 flex flex-col items-center justify-center space-y-2">
  <h2 className="text-2xl font-medium text-emphasis">{view.title}</h2>
</div>
```

### Design system

`@knack/asterisk-react` provides the base component library and Tailwind preset. The local `tailwind.config.ts` extends it:

```typescript
import { defaultPreset } from "@knack/asterisk-react";

export default {
  presets: [defaultPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/@knack/asterisk-react/dist/…",
  ],
  theme: {
    extend: {
      spacing: { "4.5": "1.125rem", "15": "3.75rem" },
      screens: { md: "769px" },
    },
  },
};
```

### Class name utilities

| Library                    | Usage                           |
| -------------------------- | ------------------------------- |
| `clsx`                     | Conditional class lists         |
| `tailwind-merge`           | Merge classes without conflicts |
| `class-variance-authority` | Typed component variant APIs    |

No CSS Modules, Styled Components, or Emotion. No inline `style` objects except where Tailwind cannot reach (e.g., dynamic hex colour values).

---

## 10. TypeScript

### tsconfig

Extends `@knack/tooling-dev-typescript-config`. Key additions:

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
├── schema/
│   ├── fields/      # One file per field type (EmailField.ts, AddressField.ts, …)
│   ├── views/       # One file per view type (LoginView.ts, TableView.ts, …)
│   ├── LiveAppPage.ts
│   └── LiveAppApplication.ts
├── apiErrors.ts
├── auth.ts
└── session.ts
```

Field and view type directories use barrel `index.ts` files for re-exports.

### Discriminated unions for API responses

```typescript
export type SignInResponse =
  | { type: "session"; session: Session }
  | { type: "password_reset"; password_reset_url: string };
```

### `as const` for constant objects

```typescript
export const ROUTES = { ROOT: '/', … } as const;
export const queryKeys = { application: 'application', … } as const;
```

### Avoid `any`

Use `unknown` at system boundaries and narrow with type guards. The extended tsconfig enforces strict mode.

---

## 11. Form Handling

### Stack

- **React Hook Form v7** — form state, registration, and submission.
- **Zod** — schema-based validation via `@hookform/resolvers/zod`.

### Setup pattern

```typescript
const {
  control,
  register,
  formState: { errors },
} = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  mode: "onBlur",
});
```

### Input binding

```typescript
// Simple native input
<Input {...register('email')} />

// Complex component (checkbox, custom picker)
<Controller
  name="remember"
  control={control}
  render={({ field }) => (
    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
  )}
/>
```

### Error display

Always use the shared `FormErrorMessage` component. Never write inline error JSX.

```typescript
<FormErrorMessage
  errors={errors}
  name={input.field.key}
  inputLabel={input.label}
  id={`${view.key}-${input.id}-error`}
/>
```

### Nested forms

`FormProvider` wraps the form tree; all inputs access state via `useFormContext()` — no prop drilling of `register` / `control`.

---

## 12. Error Handling

### Error boundaries

`react-error-boundary` is used with `FallbackComponent` props. Three boundaries exist:

| Boundary                  | Scope                         |
| ------------------------- | ----------------------------- |
| `RouterErrorBoundary`     | Whole app (wraps router)      |
| `PageEditorErrorBoundary` | Builder preview iframe        |
| Per-view boundaries       | Individual view render errors |

```typescript
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => window.location.reload()}
  onError={(error, info) => {
    addReactError(sanitizeErrorForTracking(error), info);
  }}
>
  {children}
</ErrorBoundary>
```

### API error handling

- Mutation `onError` callbacks receive typed `AxiosError` and branch on status code.
- Error shapes are defined in `/types/apiErrors.ts`.
- `401` terminal errors (trial expired, account suspended) redirect externally; others propagate.

### Error logging

- **Datadog** (`addReactError`): Captures React errors with component tree context.
- **LogRocket**: Session replay; errors sanitized before sending, authenticated users excluded.

---

## 13. Testing

> The primary testing philosophy is captured in `docs/testing.md`. This section complements it with quick-reference patterns.

### Stack

- **Vitest** (test runner, globals enabled, `jsdom` environment, 20 s timeout)
- **@testing-library/react** + **@testing-library/user-event**
- **@testing-library/jest-dom** (DOM matchers)
- **MSW** (Mock Service Worker) for network interception

### Test file locations

| Kind                  | Location                         | Example                                         |
| --------------------- | -------------------------------- | ----------------------------------------------- |
| Feature / integration | `src/tests/features/<Feature>/`  | `src/tests/features/FormView/FormView.spec.tsx` |
| Hook unit test        | Co-located next to the hook      | `useMenuLinkPagePath.spec.tsx`                  |
| Component render test | Co-located next to the component | `LoginFormContent.spec.tsx`                     |

### Custom render helpers (`src/tests/customRender.tsx`)

| Helper                             | Use                                               |
| ---------------------------------- | ------------------------------------------------- |
| `customRenderAtRoute({ url })`     | Full app with routing, React Query, all providers |
| `customRender(children)`           | React Query + providers, no routing               |
| `customRenderWithoutApp(children)` | Tooltip.Provider only                             |

`url` is relative to the app basename (`/testing-account/testing-app`). Pass `'/'` or `'/donations'`.

### Waiting for hydration

```typescript
const { router } = customRenderAtRoute({ url: "/donations" });
expect(await screen.findByText("Testing App")).toBeVisible(); // sentinel
// Now safe to make synchronous assertions
expect(screen.getByText("Donations")).toBeVisible();
```

### Navigation assertions

```typescript
import { TESTING_ROUTER_BASE_NAME } from "@/tests/fixtures/constants";

await waitFor(() => {
  expect(router.state.location.pathname).toBe(
    `${TESTING_ROUTER_BASE_NAME}/destination`,
  );
});
```

### MSW overrides

```typescript
beforeEach(() => {
  server.use(
    http.get(mockEndpoints.getLiveAppInitialization, () =>
      HttpResponse.json(buildLiveAppInitializationFixture({ … }))
    )
  );
});

it('shows error state', () => {
  server.use(http.get(mockEndpoints.getRecords, () => HttpResponse.error()));
  // …
});
```

### What must not be mocked

- `useNavigate`, `useLocation`, `useParams` — use `customRenderAtRoute` instead.
- `useViewContext`, `usePageContext`, data query hooks — let MSW populate them.
- Anything already mocked in `setupTest.ts` (`@tanstack/react-virtual`, LogRocket, Flagsmith).

---

## 14. Performance

### Lazy loading

Heavy leaf components have a `*Lazy.tsx` sibling using `React.lazy`:

```
AddressGoogleAutocompleteInput.tsx
AddressGoogleAutocompleteInputLazy.tsx   ← dynamic import
```

### Memoisation

- `useMemo` — computed context values and expensive selectors.
- `useCallback` — callbacks passed as stable references into children.
- `React.memo` — not widely used; prefer fixing prop identity via hooks.

### React Query cache defaults

`staleTime: Infinity` means data never goes stale automatically. Freshness is managed by explicit `queryClient.invalidateQueries()` calls after mutations.

### Virtualisation

`@tanstack/react-virtual` is used inside Table, Report, and Search views for long lists.

---

## 15. API Layer

### Structure

```
hooks/api/
├── queries/           # One file per query (wraps useQuery) — fetcher lives in the same file (see §6)
├── mutations/         # One file per mutation (wraps useMutation) — same
└── queryKeys.ts       # Centralised key registry

utils/
├── axiosConfig.ts     # Configured axios instance + interceptors
└── tokenUtils.ts      # Token read/write/refresh helpers
```

A handful of older features still keep their fetchers in a separate `hooks/api/<feature>/<feature>Api.ts` file
(grandfathered — see §6, "Where hooks live"). New hooks always define their fetcher inline.

### Axios instance features

- **`x-knack-rest-api-key: renderer`** and **`x-knack-live-app-version: v4`** on every request.
- **Bearer auth** injected for custom-domain / embed deployments.
- **Read/write base URL splitting** for scale-out (reads vs. writes to different endpoints).
- **Automatic token refresh** when the access token is within 30 s of expiry.

### API function shape

Whether the fetcher lives inline in a query/mutation hook file (current convention) or in a legacy
`<feature>Api.ts`, the shape is the same: a strongly-typed async function translating the raw API response into a
domain type.

```typescript
// returns a strongly-typed result, translating raw API shapes to domain types
export async function signIn(params: SignInMutationParams): Promise<SignInResponse> {
  const { data } = await axiosInstance.post('/v1/live-app/session', params, { … });
  return data.password_reset_url
    ? { type: 'password_reset', password_reset_url: data.password_reset_url }
    : { type: 'session', session: data.session };
}
```

---

## 16. Environment & Constants

### Environment variables

- Vite `envPrefix: 'PUBLIC_'` — only `PUBLIC_*` vars are exposed to the browser bundle.
- Accessed via `import.meta.env.PUBLIC_*`.
- Multiple `.env.[mode]` files for different deployment targets (qa, staging, production, per-client).

### Key env vars

```
PUBLIC_API_URL
PUBLIC_BUILDER_URL
PUBLIC_FLAGSMITH_ENV_ID
PUBLIC_LOGROCKET_APP_ID
PUBLIC_KNACK_REDIRECT_URL
```

### Feature flags

Managed by **Flagsmith**. Checked via utility functions in `/utils/flagsmith.ts`:

```typescript
import { isAdvSSOEnabled } from '@/utils/flagsmith';

if (isAdvSSOEnabled()) { … }
```

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
import { useApplicationQuery } from "@/hooks/api/queries/useApplicationQuery";
import { type LiveAppPage } from "@/types/schema/LiveAppPage";
```

### Import order (top to bottom)

1. React and React Router DOM
2. Third-party libraries
3. `@knack/*` internal packages
4. `@/types/…`
5. `@/hooks/…`
6. `@/context/…`
7. `@/components/…`
8. `@/utils/…`
9. `@/constants/…`
10. Relative imports (`./`, `../`)

Type-only imports (`import { type Foo }`) are grouped with their corresponding runtime imports, not separated.

---

## 18. Recurring Patterns

### Context provider pattern

Every context module follows this exact three-export shape:

```typescript
type FooContextState = { … };

const FooContext = createContext<FooContextState>({ … /* defaults */ });

export function FooContextProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ … }), [deps]);
  return <FooContext.Provider value={value}>{children}</FooContext.Provider>;
}

export const useFooContext = () => useContext(FooContext);
```

The raw context object is never exported.

### View composition pattern

Feature views split into three layers:

1. `*View.tsx` — top-level entry, composes context providers.
2. `*ViewRender.tsx` (or `*ViewContent.tsx`) — presentational, receives typed props.
3. Focused sub-components — tabs, rows, cells, individual inputs.

### Form input pattern

Every form input follows the same contract:

```typescript
export function SomeInput({ input, isReadOnly }: Props) {
  const { register, formState: { errors } } = useFormContext();

  return (
    <>
      <Input {...register(input.field.key)} disabled={isReadOnly} />
      <FormErrorMessage errors={errors} name={input.field.key} inputLabel={input.label} />
    </>
  );
}
```

### Query / mutation split

- Each **query/mutation hook file** owns its own network call — the plain async fetcher function is defined in the
  same file as the hook, not in a separate API-functions file (see §6, "Where hooks live", for the grandfathered
  exceptions that still split them).
- **Query hooks** wrap `useQuery` and pass the query options object.
- **Mutation hooks** wrap `useMutation`, call `invalidateQueries` on success, and handle typed errors.

### Lazy component pattern

When a component pulls in a heavy dependency:

```typescript
// AddressGoogleAutocompleteInputLazy.tsx
const AddressGoogleAutocompleteInput = lazy(
  () => import('./AddressGoogleAutocompleteInput')
);

export function AddressGoogleAutocompleteInputLazy(props: Props) {
  return (
    <Suspense fallback={<InputSkeleton />}>
      <AddressGoogleAutocompleteInput {...props} />
    </Suspense>
  );
}
```

### Discriminated union responses

API responses with multiple possible shapes use discriminated unions rather than optional fields:

```typescript
type SignInResponse =
  | { type: "session"; session: Session }
  | { type: "password_reset"; password_reset_url: string };
```

---

## Build & Tooling Reference

| Tool             | Version | Purpose                               |
| ---------------- | ------- | ------------------------------------- |
| Vite             | 7.x     | Build, dev server                     |
| TypeScript       | 5.9     | Static typing                         |
| Tailwind CSS     | 3.4     | Utility-first styling                 |
| React Query      | 5.x     | Server state                          |
| React Router DOM | 6.x     | Routing                               |
| React Hook Form  | 7.x     | Form state                            |
| Zod              | 3.x     | Schema validation                     |
| Vitest           | latest  | Test runner                           |
| MSW              | 2.x     | API mocking in tests                  |
| ESLint           | 9.x     | Linting (`@knack/eslint-config`)      |
| Prettier         | —       | Formatting (`@knack/prettier-config`) |
| Husky            | 9.x     | Pre-commit hooks                      |
| Flagsmith        | —       | Feature flags                         |
| LogRocket        | —       | Session replay                        |
| Datadog          | —       | Error tracking                        |
| i18next          | —       | Internationalisation                  |
