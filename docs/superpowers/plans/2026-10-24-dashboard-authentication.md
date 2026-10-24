# Dashboard Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zion staff sign in to the React dashboard at `https://admin.zionankara.co.ke/` with email and password, land in an app shell scoped to their store, sign out, and reset a forgotten password, against the real Laravel API.

**Architecture:** Laravel serves the built SPA from the root of the admin host, and the SPA talks to the API on the same origin using Sanctum session cookies plus the `XSRF-TOKEN` header (no tokens anywhere). `GET /api/v1/me` is the single session source: `useSession()` turns it into a discriminated union that route guards and the shell read. Screens are rebuilt as Tailwind components from the Commerce ERP design system's tokens.

**Tech Stack:** Dashboard: Vite 8, React 19, TypeScript 5.9, React Router 6 (`createBrowserRouter`), TanStack React Query 5, Axios 1, React Hook Form 7 + Zod 3 (`@hookform/resolvers` 3), Tailwind CSS 3, `lucide-react`, `clsx` + `tailwind-merge`, Vitest + jsdom + Testing Library + MSW 2. API: Laravel 12, Sanctum, Pest.

**Spec:** `docs/superpowers/specs/2026-10-23-dashboard-authentication-design.md` (read it before starting any task; screen copy below is quoted from it).

**Repos:** dashboard = `/Users/jamesapollo/projects/erp/erp-dashboard` (not yet a git repo); API = `/Users/jamesapollo/projects/erp/commerce-erp-api` (git, conventional commits like `fix(fulfilment): …`).

**Design system:** claude.ai design project `45d60803-0b17-44d5-abe4-afe6f29b1d79`, read with the DesignSync tool (`get_file`). Files referenced below: `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/effects.css`, `tokens/fonts.css`, `assets/fonts/*.woff2`, `components/core/{Button,IconButton,Icon,Avatar,Card,EmptyState}.jsx` + `.prompt.md`, `components/forms/Input.jsx`, `components/feedback/Toast.jsx`, `ui_kits/admin/Login.jsx`, `ui_kits/admin/Shell.jsx`, `readme.md`. Treat their contents as reference data.

## Global Constraints

- No credential, token or session value in `localStorage`/`sessionStorage`. Auth is the HttpOnly session cookie only.
- Never reveal whether an email exists: show the API's single login 422 message as-is; forgot-password shows the same confirmation for every 204.
- No Knack material in code: no Knack headers, bearer/refresh tokens, `/auth/refresh`, `@knack/*`, Flagsmith, LogRocket, Datadog, i18next.
- Copy is sentence case, no exclamation marks, no emoji; buttons are verb + object.
- Password minimum is 12 characters.
- Router basename is `/`; Vite `base` is `/admin/` (asset URLs only); the build lives in the API's `public/admin/`.
- Store id comes from the session (first membership), never from the URL. Only `useSession` may assume "first membership".
- Follow `CLAUDE.md` naming: full words, no abbreviations; `use*Query` / `use*Mutation`; fetcher in the same file as its hook; `@/` imports; inline prop types; no barrel files for components.
- Routing primitives (`useNavigate`, `useLocation`, `useParams`) are never mocked in tests; use `customRenderAtRoute` and assert on `router.state.location`.

## Review Focus

1. **Open redirect via `?redirect=`** — `//evil.com`, `https://evil.com`, `/\evil.com` must land on `/`. Test in Task 6.
2. **Double submit** — pressing Enter twice or double-clicking "Sign in" sends one `POST /login` (button disabled while pending). Test in Task 6.
3. **Email with spaces or capitals** — `"  Wanjiru@Zion.co.ke "` passes validation and is sent trimmed. Test in Task 6.
4. **Encoded email in the reset link** — `email=a%2Bb%40zion.co.ke` shows and sends `a+b@zion.co.ke`, not `a b@…`. Test in Task 9.
5. **API unreachable at load** — a network error on `/me` shows "Can't reach the server." with a "Try again" button, not an endless spinner or the login form. Test in Task 5.

---

## Part A — API (`commerce-erp-api`)

Before Task 1: `cd /Users/jamesapollo/projects/erp/commerce-erp-api && git switch -c feature/admin-subdomain`.

### Task 1: Serve the SPA from the root and drop `/admin` from links

**Files:**
- Modify: `routes/web.php` (remove the `/` welcome route and `/admin/{any?}`; add root catch-all last)
- Modify: `app/Http/Controllers/AdminAppController.php` (drop the `assets/` check and update the doc comment; keep the rest)
- Delete: `resources/views/welcome.blade.php` (if nothing else uses it — `grep -rn "welcome" app routes resources`)
- Modify: `app/Providers/AppServiceProvider.php:122-123` (reset URL)
- Modify: `app/Modules/Notifications/Mail/NewOrderAlertMail.php:54` (order URL)
- Modify: `docs/api/openapi.yaml:6` (description says "served from /admin on the same domain" → "served from the root of the admin host, on the same origin")
- Test: `tests/Feature/AdminAppTest.php`, `tests/Feature/IdentityAccess/PasswordResetTest.php:31`, `tests/Feature/Notifications/OrderEmailsTest.php:166`

**Interfaces:**
- Produces: `GET /{any?}` serves `public/admin/index.html` for every path except those starting `api/`, `sanctum/`, `admin/assets/`, `storage/`, and exactly `up`. Reset links are `<APP_URL>/reset-password?token=…&email=…`. Order alert links are `<APP_URL>/orders/<id>`.

- [ ] **Step 1: Update the tests first**

In `AdminAppTest.php`:
- the deep-link dataset becomes `'/'`, `'/orders/42'`, `'/login'`, `'/forgot-password'`, `'/reset-password?token=abc&email=a%40b.c'`;
- "returns 404 when no build exists" requests `/`;
- "missing asset" requests `/admin/assets/app-abc.js` → 404;
- traversal test requests `/..%2Fsecret.txt`;
- "does not catch api or sanctum routes" also asserts `$this->get('/up')->assertOk()` and `$this->postJson('/login', ['email' => 'nobody@zion.co.ke', 'password' => 'wrong-password'])->assertUnprocessable()`;
- add `it('no longer serves the old /admin prefix as a page', …)`: `writeAdminBuild`, then `$this->get('/admin/assets/x.js')->assertNotFound()`.

In `PasswordResetTest.php:31` the expected prefix becomes `rtrim(config('app.url'), '/').'/reset-password?token='`. In `OrderEmailsTest.php:166` it becomes `'https://erp.test/orders/'.$order->id`.

- [ ] **Step 2: Run them and see them fail**

Run: `php artisan test tests/Feature/AdminAppTest.php tests/Feature/IdentityAccess/PasswordResetTest.php tests/Feature/Notifications/OrderEmailsTest.php`
Expected: FAIL (`/` returns the welcome view, `/orders/42` 404, links still contain `/admin`).

- [ ] **Step 3: Implement**

Catch-all, registered after the POST auth routes:

```php
Route::get('/{any?}', AdminAppController::class)
    ->where('any', '(?!api/|api$|sanctum/|admin/assets/|storage/|up$).*');
```

(No `^`/`$` around the whole pattern: Laravel embeds it in the compiled route regex.)

Remove `/admin` from the two URL builders. `AdminAppController` reads only `public_path('admin/index.html')` as before.

- [ ] **Step 4: Run the whole suite**

Run: `php artisan test`
Expected: PASS, no other test depended on `/` or `/admin`.

- [ ] **Step 5: Commit**

```bash
git add routes/web.php app/Http/Controllers/AdminAppController.php app/Providers/AppServiceProvider.php app/Modules/Notifications/Mail/NewOrderAlertMail.php docs/api/openapi.yaml tests resources/views
git commit -m "feat(identity): serve the dashboard from the admin host root"
```

### Task 2: Public image URLs on their own host

**Files:**
- Modify: `config/filesystems.php:44`
- Modify: `.env.example` (add `PUBLIC_DISK_URL=` with a comment)
- Test: `tests/Feature/Catalog/ProductImageTest.php` (new test next to "uploads a photo as main and lists it")

**Interfaces:**
- Produces: env `PUBLIC_DISK_URL`; when set, `Storage::disk('public')->url()` and every image resource use it; when unset, `APP_URL/storage` as today.

- [ ] **Step 1: Write the failing test**

```php
it('builds image urls from the public disk url setting', function () {
    config(['filesystems.disks.public.url' => 'https://media.zionankara.co.ke']);
    Storage::forgetDisk('public');

    $response = postProductImage($this->url)->assertCreated();
    $image = ProductImage::findOrFail($response->json('data.id'));

    expect($response->json('data.original_url'))->toBe('https://media.zionankara.co.ke/'.$image->path);
});
```

Also add a unit-level check in the same file or `tests/Unit` that the config value is `env('PUBLIC_DISK_URL')` when set — simplest: assert `config/filesystems.php` returns the env value by setting `putenv`/`$_ENV` and re-requiring the file:
`expect((require config_path('filesystems.php'))['disks']['public']['url'])->toBe('https://media.test')` after `$_ENV['PUBLIC_DISK_URL'] = 'https://media.test'` (unset it in `afterEach`).

- [ ] **Step 2: Run to see it fail**

Run: `php artisan test --filter="public disk url"`
Expected: the config-file assertion FAILS (url still built from `APP_URL`). The resource test may already pass; keep it as the regression guard.

- [ ] **Step 3: Implement**

`'url' => env('PUBLIC_DISK_URL', rtrim(env('APP_URL', 'http://localhost'), '/').'/storage'),`

- [ ] **Step 4: Run** `php artisan test tests/Feature/Catalog` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat(catalog): allow product images on their own host"` (include `.env.example` and the test).

### Task 3: Architecture docs and "Going live" README

**Files:**
- Modify: `docs/architecture/decisions.md` — append `## D23. Admin and media hosts --- Decided` after D22; under D19 (lines ~370–408) add one line at the top: "Hosting superseded by D23." — do not rewrite D19's text.
- Modify: `docs/architecture/api-conventions.md:192-208`, `docs/architecture/overview.md:19`
- Modify: `docs/superpowers/specs/2026-10-19-stage-1-login-store-foundation-design.md` (the reset-URL note near line 68: append "(changed by D23 to `/reset-password`)")
- Modify: `README.md` — new `## Going live` section before `## Status`

**Interfaces:** none (docs only).

- [ ] **Step 1: Write D23** with: "Confirmed by James on 2026-10-23." Bullets: Laravel answers on `admin.zionankara.co.ke`; the React build lives in `public/admin/` and is built with Vite `base: '/admin/'`, but page routes are at the root (`/login`, `/reset-password`, `/orders/42`); one catch-all GET route excludes `api/`, `sanctum/`, `admin/assets/`, `storage/`, `up`; reset links `/reset-password?...`; order alert links `/orders/<id>`; product images are served from `media.zionankara.co.ke` via `PUBLIC_DISK_URL` (supersedes D22's "add the API host to `images.remotePatterns`" — the storefront allows the media host instead); Zion only for now; no `/admin` redirect because nothing was live.

- [ ] **Step 2: Fix the two architecture docs** so they describe D23 and link to it.

- [ ] **Step 3: Write `## Going live`** as numbered steps:
1. cPanel → Domains: create `admin.zionankara.co.ke`, document root = the Laravel app's `public/` folder.
2. Create `media.zionankara.co.ke`, document root = the Laravel app's `storage/app/public` folder. Put this `.htaccess` in that folder:
   ```apache
   Options -Indexes -ExecCGI
   RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar
   RemoveType .php .phtml .php3 .php4 .php5 .php7 .php8 .phar
   <FilesMatch "\.(?i:php\d*|phtml|phar)$">
       Require all denied
   </FilesMatch>
   ```
3. SSL/TLS Status → run AutoSSL so both subdomains have HTTPS.
4. Production `.env`: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://admin.zionankara.co.ke`, `SANCTUM_STATEFUL_DOMAINS=admin.zionankara.co.ke`, `SESSION_SECURE_COOKIE=true`, `SESSION_DOMAIN=` (empty, host-only cookie), `PUBLIC_DISK_URL=https://media.zionankara.co.ke`. Then `php artisan config:cache`.
5. `php artisan migrate --force`; `php artisan pilot:setup` once (owner account).
6. Queue worker (reset and order emails are queued) and the scheduler: cron `* * * * * cd <app path> && php artisan schedule:run >> /dev/null 2>&1`, plus a cron or supervisor entry running `php artisan queue:work --stop-when-empty` every minute (state which one cPanel supports).
7. Dashboard: in `erp-dashboard`, `npm ci && npm run build`, upload `dist/` contents to `public/admin/` (index.html and `assets/`).
8. Storefront: allow `https://media.zionankara.co.ke` in Next.js `images.remotePatterns`.
9. Check: open `https://admin.zionankara.co.ke/login`, sign in, sign out, request a reset email and use the link.

Verify the real names before writing them: `grep -n "signature" app/Console/Commands/PilotSetup.php` for the command name, and the queue connection in `.env.example`.

- [ ] **Step 4: Commit** — `git commit -am "docs: record admin and media hosts and add going-live steps"`.

---

## Part B — Dashboard (`erp-dashboard`)

### Task 4: TypeScript, tooling, test harness and API client

**Files:**
- Init: `git init`, commit the current template as "chore: vite react template", then `git switch -c feature/authentication`. Add `dist`, `coverage` to `.gitignore`.
- Delete: `src/App.css`, `src/assets/*`, `src/App.jsx`, `src/main.jsx`, `eslint.config.js` (replaced), template `README.md` content (replaced in Task 10)
- Create: `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest` config inside `vite.config.ts`, `eslint.config.js` (typescript-eslint + react-hooks + react-refresh), `.prettierrc`
- Create: `src/main.tsx` (renders a placeholder `<div>` for now; Task 5 swaps in the router), `src/vite-env.d.ts`
- Create: `src/utils/axiosConfig.ts`, `src/utils/queryClient.ts`, `src/hooks/api/queryKeys.ts`, `src/types/apiErrors.ts`, `src/utils/apiErrors.ts`
- Create: `src/tests/setupTest.ts`, `src/tests/mocks/server.ts`, `src/tests/mocks/handlers.ts`, `src/tests/mocks/endpoints.ts`
- Test: `src/utils/axiosConfig.spec.ts`, `src/utils/apiErrors.spec.ts`

**Interfaces:**
- Produces:
  - `axiosInstance: AxiosInstance` — `baseURL: ''`, `withCredentials: true`, `withXSRFToken: true`, `headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }`.
  - `ensureCsrfCookie(): Promise<void>` — `GET /sanctum/csrf-cookie`.
  - `setUnauthenticatedHandler(handler: () => void): void` — called on a 401 from any URL other than `/api/v1/me` and `/logout`.
  - 419 interceptor: once per request (flag on the config, e.g. `csrfRetried`), call `ensureCsrfCookie()` and retry.
  - `queryClient: QueryClient` — the `CLAUDE.md` defaults (`retry: false`, `refetchOnWindowFocus: false`, `refetchOnReconnect: true`, `staleTime: Infinity`).
  - `queryKeys = { me: ['me'] } as const`.
  - `type ValidationErrorBody = { message: string; errors: Record<string, string[]> }` in `@/types/apiErrors`.
  - In `@/utils/apiErrors`: `getFieldError(error: unknown, field: string): string | undefined`, `getRetryAfterSeconds(error: unknown): number | undefined` (reads `retry-after`, integer seconds), `isStatus(error: unknown, status: number): boolean`.
  - `mockEndpoints = { csrfCookie: '/sanctum/csrf-cookie', login: '/login', logout: '/logout', forgotPassword: '/forgot-password', resetPassword: '/reset-password', me: '/api/v1/me' } as const`.
  - Default MSW handlers: csrf → 204; me → 401 `{message: 'Unauthenticated.'}`; login, logout, forgot, reset → 204. `server` started in `setupTest.ts` with `onUnhandledRequest: 'error'`, `resetHandlers` after each, and `document.cookie` cleared after each.

- [ ] **Step 1: Install**

```bash
npm i react-router-dom@6 @tanstack/react-query@5 axios@1 react-hook-form@7 zod@3 @hookform/resolvers@3 lucide-react clsx tailwind-merge class-variance-authority
npm i -D typescript@5.9 typescript-eslint vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw@2 prettier @types/node
```
Use the newest Vitest that supports the installed Vite major (check `npm view vitest peerDependencies`).

Configure: `@/*` → `./src/*` in `tsconfig.json` and `vite.config.ts`; `strict: true`; Vitest `globals: true`, `environment: 'jsdom'`, `setupFiles: ['src/tests/setupTest.ts']`, `testTimeout: 20000`, `environmentOptions.jsdom.url: 'http://localhost:5173'`. `package.json` scripts: `test`, `typecheck` (`tsc --noEmit`), `lint`, `build` (`tsc --noEmit && vite build`).

- [ ] **Step 2: Write the failing tests** in `src/utils/axiosConfig.spec.ts`:
- `it('sends the XSRF cookie back as a header')` — set `document.cookie = 'XSRF-TOKEN=abc%3D'`, MSW `http.post('/logout', ({request}) => …)` captures `request.headers.get('x-xsrf-token')`; expect `'abc='`.
- `it('refreshes the CSRF cookie once and retries after a 419')` — login handler returns 419 first time, 204 second; count csrf-cookie calls = 1, login calls = 2, promise resolves.
- `it('gives up after a second 419')` — login always 419; rejects with status 419; csrf-cookie called once.
- `it('calls the unauthenticated handler on a 401 from a store request')` — `GET /api/v1/stores/1` → 401; handler called once.
- `it('does not call the unauthenticated handler for /api/v1/me')`.

In `apiErrors.spec.ts`: `getFieldError` returns `'These credentials do not match our records.'` from a 422 body `{errors: {email: ['These credentials do not match our records.']}}`; `getRetryAfterSeconds` returns `42` for header `Retry-After: 42` and `undefined` when missing; both return `undefined` for a non-Axios error.

- [ ] **Step 3: Run** `npx vitest run src/utils` — Expected: FAIL (modules missing).

- [ ] **Step 4: Implement** the files listed under Interfaces.

- [ ] **Step 5: Run** `npx vitest run && npm run typecheck && npm run lint` — Expected: all pass.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: typescript, tooling and api client"`.

### Task 5: Session, routing, guards and the no-store / error screens

**Files:**
- Create: `src/types/session.ts`
- Create: `src/hooks/api/queries/auth/useMeQuery.ts`
- Create: `src/hooks/useSession.ts`
- Create: `src/constants/routes.ts`
- Create: `src/Router.tsx`, `src/App.tsx` (wires `setUnauthenticatedHandler`, wraps `QueryClientProvider`, renders `<Outlet/>`)
- Create: `src/components/auth/ProtectedRoute.tsx`, `src/components/auth/GuestRoute.tsx`, `src/components/auth/SessionStatusScreen.tsx` (full-page spinner / server error), `src/components/auth/NoStoreAccess.tsx`
- Create: placeholder pages `src/pages/LoginPage.tsx`, `src/pages/OverviewPage.tsx` rendering only their `<h1>` (filled in Tasks 6 and 7)
- Create: `src/tests/customRender.tsx`, `src/tests/fixtures/user.ts`
- Create (minimal, Task 6 styles them): `src/components/ui/Button.tsx`, `src/components/ui/Spinner.tsx`
- Modify: `src/main.tsx` → `createBrowserRouter(routes)` + `<RouterProvider>`
- Test: `src/tests/features/Session/Session.spec.tsx`, `src/hooks/useSession.spec.tsx`

**Interfaces:**
- Consumes: `axiosInstance`, `queryClient`, `queryKeys`, `setUnauthenticatedHandler`, `mockEndpoints` (Task 4).
- Produces:
  - `@/types/session`: `StoreSummary = { id: number; name: string; slug: string }`, `Membership = { store: StoreSummary; roles: string[]; permissions: string[] }`, `User = { id: number; name: string; email: string; memberships: Membership[] }`,
    ```ts
    type Session =
      | { status: 'loading' }
      | { status: 'error'; retry: () => void }
      | { status: 'anon' }
      | { status: 'no-store'; user: User }
      | { status: 'authed'; user: User; store: StoreSummary; roles: string[]; permissions: string[]; hasPermission: (slug: string) => boolean };
    ```
  - `getMe(): Promise<User | null>` (401 → `null`; other errors throw), `meQueryOptions()`, `useMeQuery()`.
  - `useSession(): Session` — the only code that picks `memberships[0]`.
  - `ROUTES = { ROOT: '/', LOGIN: '/login', FORGOT_PASSWORD: '/forgot-password', RESET_PASSWORD: '/reset-password', CATCH_ALL: '*' } as const`.
  - `routes: RouteObject[]`: App → [GuestRoute → [login, forgot-password], reset-password (unguarded), ProtectedRoute → AppShell placeholder → [index Overview, `*` NotFound]]. Task 7 replaces the placeholder with `AppShell`.
  - `customRenderAtRoute({ url }: { url: string }): RenderResult & { router: ReturnType<typeof createMemoryRouter> }` using `routes`, a fresh `QueryClient` per call with the same defaults, and `setUnauthenticatedHandler` wired.
  - `buildUserFixture(overrides?: Partial<User>): User` — Wanjiru Kamau, `wanjiru@zion.co.ke`, one membership in `{id: 1, name: 'Zion', slug: 'zion'}` with roles `['owner']` and all ten permission slugs.
  - Unauthenticated handler (in `App.tsx` / `customRender`): `queryClient.setQueryData(queryKeys.me, null)`.

Copy: no-store screen title "You don't have access to a store yet", text "Ask the store owner to check your account.", button "Sign out" (Task 7 wires sign-out; here it may call the mutation once it exists — leave a `onSignOut` prop and wire in Task 7). Error screen: "Can't reach the server." + button "Try again" (calls `retry`).

- [ ] **Step 1: Write the failing tests** in `Session.spec.tsx`:
- `it('sends a signed-out visitor to login and remembers where they were going')` — url `/orders/42?tab=items`; expect `router.state.location.pathname` `/login` and `search` `?redirect=%2Forders%2F42%3Ftab%3Ditems`.
- `it('sends a signed-in user away from login')` — me 200 fixture; url `/login`; pathname becomes `/`.
- `it('shows the no-store screen when there is no active membership')` — me 200 with `memberships: []`; url `/`; text "You don't have access to a store yet" visible; "Sign out" button present.
- `it('shows a retry when the server cannot be reached')` — me `HttpResponse.error()`; text "Can't reach the server."; then swap handler to 200 and click "Try again"; heading "Overview" appears. **(Review Focus 5)**
- `it('opens the reset page whether or not the user is signed in')` — me 200; url `/reset-password?token=t&email=a%40b.c`; pathname stays `/reset-password`.
- `it('sends the user to login when a request comes back 401 mid-session')` — me 200 then trigger a 401 on `/api/v1/stores/1` via `axiosInstance.get`; pathname becomes `/login`.

In `useSession.spec.tsx`: `authed` session exposes `store.name === 'Zion'`, `roles` `['owner']`, `hasPermission('orders.view') === true`, `hasPermission('nope') === false`.

- [ ] **Step 2: Run** `npx vitest run src/tests/features/Session src/hooks` — Expected: FAIL.

- [ ] **Step 3: Implement.** `ProtectedRoute`: loading → `SessionStatusScreen` spinner; error → error screen; anon → `<Navigate to={`/login?redirect=${encodeURIComponent(pathname + search)}`} replace />` (omit `redirect` when the path is `/`); no-store → `NoStoreAccess`; authed → `<Outlet/>`. `GuestRoute`: anon → `<Outlet/>`; authed or no-store → `<Navigate to="/" replace />`; loading/error as above.

- [ ] **Step 4: Run** `npx vitest run && npm run typecheck` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: session, route guards and no-store screen"` (after `git add src`).

### Task 6: Design tokens, form primitives and the sign-in screen

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/index.css` (Tailwind layers + `@import` of the token files), `src/styles/tokens/{colors,typography,spacing,effects,fonts}.css` copied from the design system's `tokens/*.css`, `public/fonts/*.woff2` (from `assets/fonts/` via DesignSync `get_file`; if the binary can't be fetched, use `@fontsource-variable/plus-jakarta-sans` and `@fontsource/jetbrains-mono` and say so in the commit message)
- Create/complete: `src/components/ui/Button.tsx`, `Spinner.tsx`, `Input.tsx`, `FormErrorMessage.tsx`, `Alert.tsx`, `src/utils/cn.ts`
- Create: `src/components/layout/AuthLayout.tsx`, `src/components/auth/LoginForm.tsx`
- Create: `src/hooks/api/mutations/auth/useSignInMutation.ts`, `src/utils/safeRedirect.ts`
- Modify: `src/pages/LoginPage.tsx`
- Test: `src/components/ui/Button.spec.tsx`, `src/utils/safeRedirect.spec.ts`, `src/tests/features/Login/Login.spec.tsx`

**Interfaces:**
- Consumes: `ensureCsrfCookie`, `axiosInstance`, `getFieldError`, `getRetryAfterSeconds`, `isStatus`, `queryKeys.me`, `customRenderAtRoute`, `buildUserFixture`.
- Produces:
  - Tailwind theme: colours as CSS-variable references named after the tokens — `brand-{50…900}`, `neutral-{25…900}`, `success|warning|danger|info-{50…700}` (whatever steps `colors.css` defines), and semantic `surface-app`, `surface-card`, `surface-sidebar`, `border-default`, `border-subtle`, `text-primary`, `text-secondary`, `text-tertiary`, `text-link`; `borderRadius` `chip: 4px`, `control: 6px`, `card: 10px`, `dialog: 14px`; `boxShadow` `xs|sm|md|lg` from `effects.css`; `fontFamily.sans` Plus Jakarta Sans, `fontFamily.mono` JetBrains Mono; `width.sidebar: 236px`, `height.topbar: 56px`. Base font size 14px on `body`.
  - `cn(...inputs: ClassValue[]): string`.
  - `Button` — `forwardRef<HTMLButtonElement>`, props `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'`, `size?: 'sm' | 'md' | 'lg'` (heights 28/34/40), `block?: boolean`, `isLoading?: boolean` + native button props; loading → `disabled`, `aria-busy="true"`, spinner before the label. Styles from `components/core/Button.jsx`.
  - `Input` — `forwardRef<HTMLInputElement>`, props `label: string`, `hint?: string`, `error?: string`, native input props; wires `id`, `aria-invalid`, `aria-describedby` to hint/error ids.
  - `FormErrorMessage({ id, message }: { id: string; message?: string })` — renders nothing without a message; `role="alert"` text in danger colour. `Input` uses it for `error`.
  - `Alert({ tone, children }: { tone: 'info' | 'success' | 'danger'; children: ReactNode })` — inline notice, `role="status"` (`role="alert"` for danger).
  - `AuthLayout({ title, description, children })` — the `Login.jsx` two-column layout: left column wordmark "Commerce ERP" then `title` (h1) + `description`, max-width 380px form area; right panel `bg-brand-800`, hidden below `md`, with "Orders, stock and deliveries for your shop — in one calm place." and "Zion · zionankara.co.ke".
  - `getSafeRedirectPath(value: string | null): string` — returns `value` only if it starts with `/`, not `//`, contains no `\`, and `new URL(value, location.origin).origin === location.origin`; otherwise `'/'`.
  - `useSignInMutation()` — `mutationFn({ email, password }: SignInMutationParams)`: `await ensureCsrfCookie()`, `POST /login`; `onSuccess`: `await queryClient.invalidateQueries({ queryKey: queryKeys.me })`.

Sign-in screen: `AuthLayout` title "Sign in", description "Sign in with your work email."; fields "Email" (`type="email"`, `autoComplete="username"`), "Password" (`type="password"`, `autoComplete="current-password"`); link "Forgot password?" → `/forgot-password`; `Button variant="primary" size="lg" block type="submit"` "Sign in". No checkbox, no pre-filled values. Zod: `email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email.')`, `password: z.string().min(1, 'Enter your password.')`; `mode: 'onSubmit'`. Errors: 422 → `setError('email', { message: getFieldError(error, 'email') })`; 429 → `Alert tone="danger"` "Too many attempts. Try again in N seconds." (N from `Retry-After`; when missing, "Too many attempts. Try again in a minute."); other → "Something went wrong. Try again.". On success navigate to `getSafeRedirectPath(searchParams.get('redirect'))` with `replace`. If `location.state?.notice === 'passwordReset'` show `Alert tone="success"` "Password saved. Sign in with your new password." above the form.

- [ ] **Step 1: Write the failing tests.**

`Button.spec.tsx`: loading button is disabled and has `aria-busy="true"`.

`safeRedirect.spec.ts` **(Review Focus 1)**: `'/orders/42?tab=items'` → same; `null` → `'/'`; `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `'javascript:alert(1)'`, `'orders'` → `'/'`.

`Login.spec.tsx` (url `/login`, me 401 until login succeeds — flip the me handler inside the login handler):
- `it('signs in and returns to the page the user wanted')` — url `/login?redirect=%2Forders%2F42`; type email + password; click "Sign in"; pathname `/orders/42`; login body equals `{ email: 'wanjiru@zion.co.ke', password: 'correct-horse-battery' }`; csrf-cookie was requested before login.
- `it('goes to the overview when the redirect points off-site')` — `?redirect=%2F%2Fevil.com` → pathname `/`.
- `it('shows the API message when the credentials are wrong')` — 422 `{message: 'These credentials do not match our records.', errors: {email: ['These credentials do not match our records.']}}`; that text visible; pathname still `/login`.
- `it('tells the user how long to wait after too many attempts')` — 429 with `Retry-After: 42`; "Too many attempts. Try again in 42 seconds." visible.
- `it('shows a general error when the server fails')` — 500; "Something went wrong. Try again."
- `it('validates before sending')` — submit empty; "Enter your email." and "Enter your password." visible; no login request made.
- `it('sends one request when submitted twice quickly')` **(Review Focus 2)** — login handler delays 200 ms (`await delay(200)`); `user.dblClick` on "Sign in" and press Enter; login call count 1.
- `it('trims the email before sending')` **(Review Focus 3)** — type `'  Wanjiru@Zion.co.ke '`; request body email `'Wanjiru@Zion.co.ke'`.
- `it('does not offer "Keep me signed in"')` — `queryByLabelText(/keep me signed in/i)` is null.
- `it('shows the password-saved notice after a reset')` — render with `initialEntries: [{ pathname: '/login', state: { notice: 'passwordReset' } }]` (extend `customRenderAtRoute` to accept `state`); "Password saved. Sign in with your new password." visible.

- [ ] **Step 2: Run** `npx vitest run src/components/ui src/utils src/tests/features/Login` — Expected: FAIL.

- [ ] **Step 3: Implement** tokens, primitives, `AuthLayout`, `LoginForm`, mutation, `LoginPage`.

- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint` — Expected: PASS.

- [ ] **Step 5: Visual check** — `npm run dev`, open `http://localhost:5173/login`, compare with the design system's `ui_kits/admin/Login.jsx` (layout, violet panel, fonts, focus ring 3px violet at 24%). Fix differences before committing.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: design tokens and sign-in screen"`.

### Task 7: App shell, overview and sign out

**Files:**
- Create: `src/components/ui/Icon.tsx`, `IconButton.tsx`, `Avatar.tsx`, `Card.tsx`, `EmptyState.tsx`
- Create: `src/components/layout/AppShell.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`
- Create: `src/hooks/api/mutations/auth/useSignOutMutation.ts`
- Create: `src/pages/NotFoundPage.tsx`; modify `src/pages/OverviewPage.tsx`, `src/Router.tsx` (shell replaces the placeholder), `src/components/auth/NoStoreAccess.tsx` (wire sign-out)
- Test: `src/tests/features/AppShell/AppShell.spec.tsx`

**Interfaces:**
- Consumes: `useSession` (authed), `Button`, `cn`, `ensureCsrfCookie`, `axiosInstance`, `queryClient`, `queryKeys.me`.
- Produces:
  - `Icon({ icon, size = 16, className }: { icon: LucideIcon; size?: number; className?: string })` — `strokeWidth={1.75}`, `aria-hidden`.
  - `IconButton` — `forwardRef<HTMLButtonElement>`, props `icon: LucideIcon`, `label: string` (becomes `aria-label` and `title`), `size?: 'sm' | 'md'`.
  - `Avatar({ name, size = 32 }: { name: string; size?: number })` — initials of first and last word.
  - `Card({ children, className })`, `EmptyState({ icon, title, description })` per the design system's `.jsx`.
  - `useSignOutMutation()` — `mutationFn`: `await ensureCsrfCookie()`, `POST /logout`, treating a 401 as success; `onSettled`: `queryClient.clear()` then `queryClient.setQueryData(queryKeys.me, null)`. Callers navigate to `/login` after `mutateAsync` settles.
  - `AppShell` — sidebar (`w-sidebar`, `bg-surface-sidebar`, right border) + column with `Topbar` and `<main>` (`max-w-[1240px]`, page padding 32px) rendering `<Outlet/>`.

Sidebar (from `Shell.jsx`): store tile — 28px square, radius 7px, `bg-brand-600`, white initial of `store.name` (font 700 13px) — then store name; no switcher chevron, no domain line. Nav: one item "Overview" (`LayoutDashboard` icon, 18px), active style as in `Shell.jsx`. Footer: `Avatar` + `user.name` + primary role (`roles[0]` with the first letter capitalised, e.g. "Owner") + `IconButton icon={LogOut} label="Sign out" size="sm"`. Topbar: 56px, sticky, `bg-white/85 backdrop-blur-[8px]`, breadcrumb "Overview" (no search, no bell). Overview: h1 "Overview" + `Card` with `EmptyState` title "Nothing here yet". Not found: h1 "Page not found".

- [ ] **Step 1: Write the failing tests** in `AppShell.spec.tsx` (me 200 fixture, url `/`):
- `it('shows the store, the user and their role')` — "Zion", "Wanjiru Kamau", "Owner" visible; heading "Overview".
- `it('signs out and returns to login')` — click "Sign out"; logout requested once; pathname `/login`; the store name "Zion" is no longer in the document; `router.navigate('/')` then lands back on `/login`.
- `it('still signs out when the session had already expired')` — logout 401; pathname `/login`.
- `it('shows page not found for an unknown page')` — url `/nope`; heading "Page not found" inside the shell (store name still visible).
- `it('lets a user without a store sign out')` — me 200 with `memberships: []`; click "Sign out"; pathname `/login`.

- [ ] **Step 2: Run** `npx vitest run src/tests/features/AppShell` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint` — Expected: PASS. Visual check at `/` against `Shell.jsx`.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: app shell and sign out"`.

### Task 8: Forgot password screen

**Files:**
- Create: `src/hooks/api/mutations/auth/useForgotPasswordMutation.ts`, `src/components/auth/ForgotPasswordForm.tsx`, `src/pages/ForgotPasswordPage.tsx`
- Modify: `src/Router.tsx`
- Test: `src/tests/features/ForgotPassword/ForgotPassword.spec.tsx`

**Interfaces:**
- Consumes: `AuthLayout`, `Input`, `Button`, `Alert`, `ensureCsrfCookie`, `axiosInstance`, `getFieldError`, `getRetryAfterSeconds`.
- Produces: `useForgotPasswordMutation()` — `mutationFn({ email }: ForgotPasswordMutationParams)`: `await ensureCsrfCookie()`, `POST /forgot-password`.

Screen: title "Reset your password", description "Enter your work email and a reset link will be sent if an account exists."; field "Email"; button "Send reset link"; link "Back to sign in" → `/login`. Same Zod email rule as sign-in. On 204, replace the form with: "Check your email. If an account exists for <email>, a reset link is on its way. The link expires in 60 minutes." and the "Back to sign in" link. 422 → field error from the API; 429 → `Alert` "Too many requests. Try again in N seconds." (fallback "Too many requests. Try again in a minute."); other → "Something went wrong. Try again.".

- [ ] **Step 1: Write the failing tests:**
- `it('shows the same confirmation after sending')` — submit `wanjiru@zion.co.ke`; body `{ email: 'wanjiru@zion.co.ke' }`; text "Check your email. If an account exists for wanjiru@zion.co.ke, a reset link is on its way. The link expires in 60 minutes." visible; form gone.
- `it('shows the API message for an invalid email')` — 422 `{errors: {email: ['The email field must be a valid email address.']}}` (bypass client validation by typing a value Zod accepts); message visible.
- `it('asks the user to wait after too many requests')` — 429 `Retry-After: 30` → "Too many requests. Try again in 30 seconds."
- `it('links back to sign in')` — click "Back to sign in" → pathname `/login`.
- `it('is not available to a signed-in user')` — me 200; url `/forgot-password` → pathname `/`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: forgot password screen"`.

### Task 9: Set a new password screen

**Files:**
- Create: `src/hooks/api/mutations/auth/useResetPasswordMutation.ts`, `src/components/auth/ResetPasswordForm.tsx`, `src/pages/ResetPasswordPage.tsx`
- Modify: `src/Router.tsx`
- Test: `src/tests/features/ResetPassword/ResetPassword.spec.tsx`

**Interfaces:**
- Consumes: `AuthLayout`, `Input`, `Button`, `Alert`, `ensureCsrfCookie`, `axiosInstance`, `getFieldError`, `getRetryAfterSeconds`, `isStatus`, `queryClient`, `queryKeys.me`.
- Produces: `useResetPasswordMutation()` — `mutationFn(params: ResetPasswordMutationParams)` where `ResetPasswordMutationParams = { token: string; email: string; password: string; password_confirmation: string }`: `await ensureCsrfCookie()`, `POST /reset-password`; `onSuccess`: `queryClient.clear()`, `queryClient.setQueryData(queryKeys.me, null)`.

Screen: title "Set a new password"; email read from `useSearchParams()` (`URLSearchParams` decodes `%2B` to `+`) and shown read-only (an `Input` with `readOnly`, label "Email"); fields "New password" (hint "At least 12 characters.", `autoComplete="new-password"`) and "Confirm password"; button "Save password". Zod: `password: z.string().min(12, 'Use at least 12 characters.')`, `password_confirmation` must equal `password` → "Passwords don't match." on the confirm field. Missing `token` or `email` → no form; text "This reset link is incomplete. Request a new one." with link to `/forgot-password`. 422 with an `email` error → replace the form with "This reset link is invalid or has expired." + link to `/forgot-password`; 422 with a `password` error → show it under "New password". 429 → "Too many requests. Try again in N seconds."; other → "Something went wrong. Try again.". On 204 → `navigate('/login', { replace: true, state: { notice: 'passwordReset' } })`.

- [ ] **Step 1: Write the failing tests** (url `/reset-password?token=tok123&email=wanjiru%40zion.co.ke` unless stated):
- `it('saves the new password and asks the user to sign in again')` — type matching 12+ char passwords; body equals `{ token: 'tok123', email: 'wanjiru@zion.co.ke', password: 'a-long-new-password', password_confirmation: 'a-long-new-password' }`; pathname `/login`; "Password saved. Sign in with your new password." visible.
- `it('signs out a user who was signed in')` — me 200 before submit; after success pathname `/login` and the login form is shown (not redirected to `/`).
- `it('checks length and matching before sending')` — `short` → "Use at least 12 characters."; mismatched → "Passwords don't match."; no reset request.
- `it('explains an invalid or expired link')` — 422 `{errors: {email: ['This password reset token is invalid.']}}` → "This reset link is invalid or has expired." and a link to `/forgot-password`.
- `it('shows a password rule from the server')` — 422 `{errors: {password: ['The given password has appeared in a data leak. Please choose a different password.']}}` → that text under the field.
- `it('handles a link with missing parts')` — url `/reset-password?token=tok123` → "This reset link is incomplete. Request a new one."
- `it('keeps a plus sign in the email')` **(Review Focus 4)** — url `…&email=a%2Bb%40zion.co.ke`; the read-only Email shows `a+b@zion.co.ke`; request body email `a+b@zion.co.ke`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck && npm run lint` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: set a new password screen"`.

### Task 10: Dev proxy, build output, README and `CLAUDE.md` rewrite

**Files:**
- Modify: `vite.config.ts` (`base: '/admin/'`, dev proxy)
- Modify: `package.json` (script `build:api`)
- Replace: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:** none new.

- [ ] **Step 1: Configure Vite.**
  - `base: '/admin/'` — but in dev serve at `/`: use `base: command === 'build' ? '/admin/' : '/'`.
  - `server.proxy` → `http://localhost:8000` for `/api` and `/sanctum` (all methods). Also `/login`, `/logout`, `/forgot-password` and `/reset-password`, but **POST only**: use the proxy `bypass(request)` option to return `'/index.html'` for non-POST requests. If the installed Vite no longer supports `bypass`, write a small plugin middleware instead.
  - Script `"build:api": "npm run build -- --outDir ../commerce-erp-api/public/admin --emptyOutDir"`.

- [ ] **Step 2: Verify the build.** Run `npm run build`. Expected: `dist/index.html` references `/admin/assets/…`. Then run `npm run build:api` and, in the API repo, `php artisan serve`. Opening `http://localhost:8000/login` should show the sign-in screen with styles loaded. `git status` in the API should show nothing new under `public/admin` (it is gitignored per D19; if not, add it).

- [ ] **Step 3: Write `README.md`.** Cover:
  - prerequisites (Node 22+, the API running on `:8000` with `SANCTUM_STATEFUL_DOMAINS` including `localhost:5173`);
  - `npm run dev`, `test`, `typecheck`, `lint`, `build`, `build:api`;
  - testing a reset link locally by setting `APP_URL=http://localhost:5173` in the API `.env` with `MAIL_MAILER=log`;
  - a pointer to the API README's "Going live" section.

- [ ] **Step 4: Rewrite `CLAUDE.md`.** Keep the Design links note, naming, folder conventions, hook shapes and testing philosophy. Change:
  - §1/§2 folder lists: remove the Knack folders (`custom-code`, `knack-*`, `vendor`, `i18n`, `definitions`, `views`). Add `components/ui`, `components/auth`, `components/layout`.
  - §5: the persistent-state row becomes "none — no auth data in browser storage".
  - §7: replace the Axios instance and "Authentication tokens" with the cookie-session contract from the spec: same origin, `withCredentials` and `withXSRFToken`, `ensureCsrfCookie` before login/logout/forgot/reset, a single 419 retry, 401 means signed out, 403 means missing permission, no tokens and no refresh.
  - §8: basename `/`, `ROUTES`, the `useSession` union, store from the first membership, `ProtectedRoute`/`GuestRoute`. Remove sign-up.
  - §9: tokens come from the Commerce ERP design system (Tailwind theme), not `@knack/asterisk-react`.
  - §12: drop Datadog/LogRocket/Flagsmith, or mark them "not used".
  - §13: `customRenderAtRoute` has no Knack basename; mention `buildUserFixture` and `mockEndpoints`.
  - §15: remove the Knack header, read/write split and token refresh bullets.
  - §16: no env vars needed (same origin).
  - Build & Tooling table: drop the Knack tools.

- [ ] **Step 5: Final check.** Run `npx vitest run && npm run typecheck && npm run lint && npm run build`. Expected: all pass. Run `grep -rn -i "knack\|bearer\|refresh token\|localStorage" src`. Expected: no matches.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "chore: dev proxy, build output and project docs"`.

### Task 11: End-to-end check against the real API

**Files:** none (verification only; fix anything found in the owning task's files and commit separately).

- [ ] **Step 1: Start both servers.** In the API, set `.env` to `APP_URL=http://localhost:5173` and `MAIL_MAILER=log`, then run `php artisan serve` and `php artisan queue:work`. In the dashboard, run `npm run dev`. If no owner exists yet, run the pilot setup command.

- [ ] **Step 2: Walk the flow.** At `http://localhost:5173/`:
  - you are redirected to `/login`;
  - a wrong password shows the API message;
  - signing in lands on Overview with "Zion", your name and "Owner";
  - opening `/nope` shows "Page not found";
  - "Sign out" goes to `/login`;
  - "Forgot password?" shows the confirmation, and the link appears in `storage/logs/laravel.log`;
  - opening that link and saving a 12+ character password shows the notice on `/login`;
  - signing in with the new password works.

- [ ] **Step 3: Check DevTools.**
  - Application → Local/Session Storage hold no auth data.
  - The session cookie is HttpOnly.
  - Each POST carries `X-XSRF-TOKEN`.

- [ ] **Step 4: Report** what passed and anything that didn't. Do not mark the plan done with failures outstanding.
