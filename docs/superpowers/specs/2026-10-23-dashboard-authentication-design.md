# Dashboard authentication — design

Date: 2026-10-23
Repos: `erp-dashboard` (React SPA, this repo) and `commerce-erp-api` (Laravel, sibling folder `../commerce-erp-api`)

## Intent

Nothing in the dashboard is built yet. Authentication is the first slice: a Zion staff member signs in with their
own email and password, lands in the dashboard for Zion, and can sign out or reset a forgotten password. Everything
later (orders, products, stock…) builds on the session, store and permissions this slice establishes.

The screens come from the Commerce ERP design system (claude.ai design project
`45d60803-0b17-44d5-abe4-afe6f29b1d79`, read through the DesignSync tool — see `ui_kits/admin/Login.jsx`,
`ui_kits/admin/Shell.jsx`, `tokens/*.css`, `readme.md`). The behaviour comes from the API contract
(`../commerce-erp-api/docs/api/openapi.yaml`, Authentication and Identity tags). Where the two disagree, the API wins
and the design is adjusted (listed below).

## Goals

- Sign in, sign out, forgot password and set a new password, all working against the real Laravel API.
- A session model the rest of the dashboard reads from: who the user is, which store they act in, what they may do.
- The dashboard served at `https://admin.zionankara.co.ke/` (root, not `/admin`).
- The repo set up with the stack `CLAUDE.md` describes, and `CLAUDE.md` corrected so it matches this API.

## Non-goals

- Invite acceptance, sign-up, or any account creation from the dashboard. Accounts are created on the server (the
  `PilotSetup` command creates the owner); there is no API for anything else yet.
- "Keep me signed in" / remember-me. The API deliberately has none (120-minute idle session).
- Multi-store switching. Zion is the only store for now.
- Any real dashboard page beyond an empty Overview placeholder inside the shell.
- Changing password while signed in, profile editing, 2FA.

## Anti-goals

- Storing any credential or session secret in `localStorage`/`sessionStorage`. Auth is the HttpOnly session cookie
  only; the dashboard never sees a token.
- Telling the user whether an email exists. The API returns one message for every login failure and 204 for every
  valid forgot-password request; the UI must not add hints that undo that.
- Copying the Knack-specific parts of `CLAUDE.md` (Knack headers, bearer/refresh tokens, `/auth/refresh`,
  `@knack/asterisk-react`, Flagsmith, LogRocket, Datadog, i18next) into code.

## Decisions

### Hosting: Laravel answers on the admin subdomain (decided by the user)

`admin.zionankara.co.ke` points at the Laravel app. The SPA and the API share that one origin, so there is no CORS,
and cookies are host-only. The Next.js storefront keeps calling the API with signed server-to-server requests and is
unaffected. Everything runs on the same cPanel account. Product images are served from their own subdomain,
`media.zionankara.co.ke` (decided by the user), so storefront image URLs don't carry the admin host.

### Stack (decided by the user)

The one in `CLAUDE.md`: TypeScript, React Router v6 (`createBrowserRouter`), TanStack React Query 5, Axios, React Hook
Form 7 + Zod, Tailwind CSS 3, Vitest + Testing Library + MSW. The repo is currently a plain-JS Vite/React 19 template
and must be converted. The `@knack/*` packages are not used; ESLint/Prettier use standard configs instead of
`@knack/eslint-config` / `@knack/prettier-config`.

### API contract the dashboard uses

All on the same origin.

| Call | Notes |
| --- | --- |
| `GET /sanctum/csrf-cookie` → 204 | Sets `XSRF-TOKEN` + session cookie. Call before login, forgot, reset, logout. |
| `POST /login` `{email, password}` → 204 | 422 `{message, errors: {email: [...]}}` for every failure; 429 + `Retry-After`; 419 CSRF. Rate limit 5/min per email+IP. |
| `POST /logout` → 204 | 401 if already signed out. |
| `POST /forgot-password` `{email}` → 204 | Always 204 for valid input. 422 only for invalid email format. 429 + `Retry-After` (3/min). |
| `POST /reset-password` `{token, email, password, password_confirmation}` → 204 | 422 on `email` for any token/email/account failure; password ≥ 12 chars. Ends all the user's sessions. 429 (5/min). |
| `GET /api/v1/me` → 200 `{data: User}` | `User = {id, name, email, memberships: [{store: {id, name, slug}, roles: string[], permissions: string[]}]}`. Only active memberships in active stores. 401 when signed out or disabled. |

Every state-changing request sends the `X-XSRF-TOKEN` header (Axios does this from the cookie when `withCredentials`
and `withXSRFToken` are set). Requests send `Accept: application/json`.

### Session model

- `useMeQuery()` (`/api/v1/me`) is the single source of truth. `useSession()` derives
  `{ status: 'loading' | 'authed' | 'anon' | 'no-store', user, store, permissions }`:
  - 401 → `anon` (the 401 is an expected answer for this query, not an error).
  - 200 with no memberships → `no-store`.
  - 200 with memberships → `authed`, `store` = the first membership's store, `permissions` = its permission slugs.
    (Zion only, so there is one. Picking the first is deliberate and must be the only place that assumes it.)
- A `hasPermission(slug)` helper on the session; nothing in this slice uses it beyond being available.
- Store id comes from the session, never from the URL.

### Axios behaviour

- `baseURL` is empty (same origin), `withCredentials: true`, `withXSRFToken: true`, `Accept: application/json`.
- On **419**: fetch `/sanctum/csrf-cookie` once and retry the original request once. A second 419 is surfaced.
- On **401** from any request other than `/api/v1/me`: set the `me` query data to signed-out so the guard redirects to
  login. (Covers session expiry mid-use and a disabled user.)
- No refresh tokens, no token storage, no 403 → sign-out (403 means "missing permission" in this API, not "signed
  out").

### Routes (dashboard, basename `/`)

| Path | Who | Screen |
| --- | --- | --- |
| `/login` | anon only (authed → `/`) | Sign in |
| `/forgot-password` | anon only | Request a reset link |
| `/reset-password?token=…&email=…` | anyone (the link may be opened while signed in) | Set a new password |
| `/` and everything else | authed (`ProtectedRoute`) | App shell + page |
| — | `no-store` status | "No store access" screen instead of the shell |

`ProtectedRoute`: `loading` → full-page spinner; `anon` → redirect to `/login?redirect=<path+search>`;
`no-store` → no-store screen; `authed` → `<Outlet/>`. After sign-in, go to the `redirect` value if it is a same-origin
relative path starting with `/` (and not `//`), otherwise `/`.

Unknown authed paths render a simple "Page not found" inside the shell.

### Screens

Design tokens and the look follow the design system readme (violet brand, warm neutrals, Plus Jakarta Sans,
14px base, 6px control radius, 10px card radius, focus ring 3px violet at 24%). Copy is sentence case, no
exclamation marks.

**Sign in** — `Login.jsx` layout: two columns, form left (wordmark "Commerce ERP", "Sign in" title), solid brand-800
panel right with "Orders, stock and deliveries for your shop — in one calm place." and "Zion · zionankara.co.ke".
Below `md` the right panel is hidden.
- Changes from the design: no "Keep me signed in" checkbox; subtitle is "Sign in with your work email." (there is no
  invite flow); no pre-filled values.
- Fields: Email, Password. "Forgot password?" link → `/forgot-password`. Primary large full-width "Sign in" button
  with loading state.
- Zod: email required + valid format; password required.
- 422 → show the API's `errors.email[0]` under the email field. 429 → form-level message "Too many attempts. Try
  again in N seconds." using `Retry-After`. Network/5xx → "Something went wrong. Try again."
- On success: invalidate/refetch `me`, then navigate (see redirect rule).

**Forgot password** — same layout. Title "Reset your password", subtitle "Enter your work email and a reset link will
be sent if an account exists." One Email field, "Send reset link" button, "Back to sign in" link.
- On 204: replace the form with "Check your email. If an account exists for <email>, a reset link is on its way. The
  link expires in 60 minutes." plus "Back to sign in". Same message whether or not the account exists.
- 422 → field error; 429 → "Too many requests. Try again in N seconds."

**Set a new password** — same layout. Title "Set a new password". Email shown read-only from the query string;
fields New password, Confirm password; "Save password" button.
- Zod: password ≥ 12 chars; confirmation must match. Helper text "At least 12 characters."
- Missing `token` or `email` in the URL → message "This reset link is incomplete. Request a new one." with a link to
  `/forgot-password`.
- 422 on `email` → "This reset link is invalid or has expired." with a link to `/forgot-password`. 422 on
  `password` → show under the password field (covers the production "compromised password" check).
- On 204: clear the React Query cache, go to `/login` showing a notice "Password saved. Sign in with your new
  password." (all sessions were ended).

**App shell** — from `Shell.jsx`, only what this slice needs:
- 236px sidebar: store tile (initial "Z" on brand-600) + store name from the session (no switcher chevron); an
  "Overview" nav item; footer with Avatar (initials), user name, primary role name (sentence-cased, e.g. "Owner") and
  a sign-out IconButton (aria-label "Sign out").
- 56px top bar with breadcrumbs ("Overview"). Search and notifications are not in this slice.
- Overview page: page title "Overview" and an empty state "Nothing here yet".

**No store access** — centred card: "You don't have access to a store yet", "Ask the store owner to check your
account.", and a "Sign out" button.

**Sign out** — calls `/logout` (ignore a 401), then `queryClient.clear()` and navigate to `/login`.

### Components built in this slice

Rebuilt as our own Tailwind components from the design system's `components/` (read the `.jsx` and `.prompt.md`
through DesignSync for the exact variants): `Button` (primary/secondary/ghost, sm/md/lg, `block`, `loading`),
`IconButton`, `Icon` (use the `lucide-react` package rather than the CDN), `Input` (label, hint, error, `id`
wiring for `aria-describedby`), `Avatar`, `Card`, `EmptyState`, `Spinner`, `FormErrorMessage`, plus an inline
`Alert`/notice for form-level messages. Only the variants these screens use.

Tokens go into `tailwind.config.ts` (colours, radii, shadows, font families, spacing additions) copied from the
design system's `tokens/*.css`. Fonts are self-hosted from the design system's `assets/fonts/` woff2 files.

### Backend changes (`commerce-erp-api`)

1. **Serve the SPA from the root.** Replace `Route::get('/admin/{any?}', …)` and the `/` welcome route with a
   catch-all GET that serves `public/admin/index.html`, excluding `api/*`, `sanctum/*`, `admin/assets/*`, `storage/*`
   and `up`. Laravel's auth routes are POST-only, so `GET /login` and `GET /reset-password` fall through to the SPA.
   The build still lives in `public/admin/` (index.html + `assets/`), so Vite builds with `base: '/admin/'` (asset
   URLs only) while the router basename is `/`. Keep the existing guarantees: `no-cache, private` header, 404 when no
   build exists, never read a file derived from the path. Update `AdminAppTest`.
2. **Reset link** in `AppServiceProvider`: `<APP_URL>/reset-password?token=…&email=…`. Update `PasswordResetTest`.
3. **New-order email link** in `NewOrderAlertMail`: `<APP_URL>/orders/<id>`. Update `OrderEmailsTest`.
4. **Config/docs**: production `.env` uses `APP_URL=https://admin.zionankara.co.ke` and
   `SANCTUM_STATEFUL_DOMAINS=admin.zionankara.co.ke`; `.env.example` keeps `localhost:5173`. Update the OpenAPI
   description ("served from /admin") and the stage 1 spec note on reset URLs.
5. **Image URLs on their own host.** Add an env setting (e.g. `PUBLIC_DISK_URL`) for the public disk's `url` in
   `config/filesystems.php`, defaulting to `APP_URL/storage` when unset. Production sets it to
   `https://media.zionankara.co.ke`, so product image URLs become
   `https://media.zionankara.co.ke/stores/<store id>/products/<product id>/…`. Add it to `.env.example`. Cover it with
   a test that the image resources use the setting.
6. **No `/admin` redirect.** Nothing is live (pre-launch), so old `/admin/...` links don't need to keep working.
7. **README "Going live" section** in `commerce-erp-api` (requested by the user), covering the production setup on
   cPanel:
   - `admin.zionankara.co.ke` subdomain → document root is the Laravel `public/` folder.
   - `media.zionankara.co.ke` subdomain → document root is `storage/app/public`; an `.htaccess` there that disables
     PHP execution and only serves files.
   - Production `.env`: `APP_URL=https://admin.zionankara.co.ke`, `SANCTUM_STATEFUL_DOMAINS=admin.zionankara.co.ke`,
     `PUBLIC_DISK_URL=https://media.zionankara.co.ke`, `SESSION_SECURE_COOKIE=true`, `SESSION_DOMAIN` left null
     (host-only cookie), `APP_ENV=production`, `APP_DEBUG=false`.
   - HTTPS (AutoSSL) on both subdomains.
   - Building the dashboard and placing it in `public/admin/`; running migrations, the queue worker (reset and
     order emails are queued) and the scheduler cron.
   - The storefront's Next.js image settings allowing `media.zionankara.co.ke`.
8. **Architecture docs** (my call: they describe a decision the user has now changed, so they are updated in this
   slice): add a new entry to `docs/architecture/decisions.md` that supersedes the `/admin` hosting decision
   (around lines 365–410) rather than silently editing it, and fix `docs/architecture/api-conventions.md`
   (lines ~192–208) and `docs/architecture/overview.md` (line ~19).

### Local development

Vite dev server on `localhost:5173` proxies `/sanctum`, `/login`, `/logout`, `/forgot-password`, `/reset-password`
(POST only — GETs must stay with Vite so the SPA routes load) and `/api` to `http://localhost:8000`. Cookies are
then same-origin from the browser's point of view. `localhost:5173` is already in `SANCTUM_STATEFUL_DOMAINS`.

To try a reset link locally against the Vite server, set `APP_URL=http://localhost:5173` in the API's local `.env`
(the link then opens `/reset-password` on Vite); otherwise the link opens the built SPA on port 8000.

`npm run build` outputs to `../commerce-erp-api/public/admin/` (or a documented copy step); `dist` stays out of git.

### `CLAUDE.md` rewrite

Rewrite the auth/session/data-fetching sections to match this design: cookie sessions, CSRF, no tokens, no refresh,
the 401/419/403 meanings above, `useSession` shape `{status, user, store, permissions}`, routes at the root of
`admin.zionankara.co.ke`. Remove or mark as not-applicable the Knack-specific material (Knack headers, read/write URL
splitting, `@knack/*`, Flagsmith, LogRocket, Datadog, Knack view/form-input patterns, `/testing-account/testing-app`
basename). Keep the general conventions (naming, folder layout, hook shapes, testing philosophy).

### Testing

- Dashboard: Vitest + MSW feature tests per screen, with handlers for every contract call above. Cover: successful
  sign-in and redirect back; 422 message shown; 429 countdown text; 419 retried once; protected route redirects
  anon to `/login?redirect=…`; authed user visiting `/login` goes to `/`; no-store screen; sign-out clears and
  redirects; forgot-password shows the same confirmation; reset with mismatched passwords, with invalid token (422),
  with missing query params, and success → login notice; 401 mid-session sends to login. Routing primitives are not
  mocked (per `CLAUDE.md`).
- Backend: the updated Pest tests listed above.
- Manual check: run both servers, sign in with the `PilotSetup` owner, sign out, request and use a reset link (mail
  log driver).

## Left to the builder

- Exact Tailwind class choices, file names within the `CLAUDE.md` conventions, and component internals.
- Whether the build writes straight into the API's `public/admin` or copies there via a script.
- Spinner/loading visuals and minor copy polish within the voice rules.
