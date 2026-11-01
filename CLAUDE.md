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
├── components/     # UI components: ui/ (primitives), auth/, layout/
├── constants/      # Global constants (UPPER_CASE exports), e.g. routes.ts
├── hooks/          # Custom hooks (generic + API-specific)
├── pages/          # Page-level route components
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

---

## 2. Component Organization

### Folder structure under `src/components/`

```
components/
├── ui/        # Design-system primitives (Button, Input, Card, Alert, Icon, …)
├── auth/      # Sign-in, forgot/reset forms, ProtectedRoute, GuestRoute
└── layout/    # AuthLayout and the signed-in AppShell (Sidebar, Topbar)
```

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

| Layer            | Library              | Scope                                         |
| ---------------- | -------------------- | --------------------------------------------- |
| Server state     | TanStack React Query | API responses, caching, background sync       |
| App/UI state     | React Context API    | Cross-cutting UI state only (none yet)        |
| Form state       | React Hook Form      | Per-form field values, validation, submission |
| Persistent state | none                 | No auth data in browser storage               |

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

Every context module exports a provider and a consumer hook:

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
│   ├── queries/auth/useMeQuery.ts            # fetcher + hook, one file
│   └── mutations/auth/                       # useSignInMutation, useSignOutMutation,
│                                             # useForgotPasswordMutation, useResetPasswordMutation
├── useSession.ts                             # the session union, derived from useMeQuery
└── useSignOut.ts                             # sign-out action shared by the shell
```

There is no separate `<feature>Api.ts` file. Add a new fetcher next to the hook that uses it.

Naming: `use*Query` / `use*Mutation`. Fetcher functions go through the single configured `axiosInstance`
(`/utils/axiosConfig.ts`) and return domain types — never call `fetch`/`axios` directly from a component.

### Query keys

All keys live in `/hooks/api/queryKeys.ts` as a `const` object. Never inline a key string.

```typescript
export const queryKeys = {
  me: ['me'],
} as const;
```

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
              { index: true, element: <OverviewPage /> },
              { path: ROUTES.CATCH_ALL, element: <NotFoundPage /> },
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
  CATCH_ALL: '*',
} as const;
```

Never write a path string inline; use `ROUTES`. There is no sign-up route: staff accounts are created by an
administrator.

### Do not mock routing primitives

`useNavigate`, `useLocation`, `useParams` must never be mocked in tests. Use `customRenderAtRoute` and assert on `router.state.location` instead.

### Session and protected routing (store identity from the session, not the URL)

Routes carry no store or tenant identifier. The backend resolves the user from the session cookie, and the app reads
the active store from the session. Never put a store id in a route or trust one from the URL.

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
  `error`, redirects `anon` to `ROUTES.LOGIN`, shows a no-access screen for `no-store`, and renders `<Outlet />` when
  `authed`.
- `GuestRoute` (`components/auth/GuestRoute.tsx`) owns the post-sign-in redirect: an `authed` user goes to
  `getSafeRedirectPath(?redirect)` (replace), a `no-store` user to `ROUTES.ROOT`. `LoginForm` does not navigate itself.
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
semantic classes rather than raw values. Primitives live in `src/components/ui/`. Fonts come from the `@fontsource`
packages (`@fontsource-variable/plus-jakarta-sans`, `@fontsource/jetbrains-mono`), not a CDN.

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

// A non-native input (custom picker, switch) would use <Controller name control render />
// instead of register. No such input exists yet.
```

### Error display

Always use the shared `FormErrorMessage` component. Never write inline error JSX. Validation messages come from
the Zod schema; server validation messages (the API's 422 body) are mapped with `getFieldError` and shown as-is.

```typescript
<FormErrorMessage id="email-error" message={errors.email?.message} />
```

### Nested forms

`FormProvider` wraps the form tree; all inputs access state via `useFormContext()` — no prop drilling of `register` / `control`.

---

## 12. Error Handling

### Error boundaries

Not used so far. Render failures surface through React's default behaviour; add a boundary when a screen needs one.

### API error handling

- Mutation callbacks and `onError` receive `AxiosError`; branch with the helpers in `/utils/apiErrors.ts`
  (`isStatus`, `getFieldError`, `getRetryAfterSeconds`, `getTooManyRequestsMessage`).
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
`'/reset-password?token=…'`. Fixtures live in `src/tests/fixtures/` (`buildUserFixture` for a `User` with a
membership), and the MSW endpoint paths in `src/tests/mocks/endpoints.ts` (`mockEndpoints`).

### Waiting for hydration

`useSession` starts as `loading`, so wait for a sentinel before asserting.

```typescript
server.use(http.get(mockEndpoints.me, () => HttpResponse.json({ data: buildUserFixture() })));
const { router } = customRenderAtRoute({ url: '/' });
expect(await screen.findByRole('heading', { name: 'Overview' })).toBeVisible();
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
└── queryClient.ts     # the single QueryClient
```

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

If a context module is added, it follows this shape (none exist yet):

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
