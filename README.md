# Commerce ERP dashboard

The admin dashboard for Commerce ERP: a React single-page app that signs staff in against the Laravel API with a cookie session. In production the build is served by the API itself from `public/admin/`.

## Prerequisites

- Node 22 or newer.
- The API running on `http://localhost:8000` (`php artisan serve` in `commerce-erp-api`).
- `SANCTUM_STATEFUL_DOMAINS` in the API `.env` includes `localhost:5173`. The API's `.env.example` already does.

## Scripts

| Command             | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run dev`       | Starts Vite on `http://localhost:5173`, proxying API calls to `:8000`.      |
| `npm test`          | Runs the Vitest suite once.                                                 |
| `npm run typecheck` | Type-checks the app and the Vite config.                                    |
| `npm run lint`      | Runs ESLint.                                                                |
| `npm run build`     | Type-checks, then builds to `dist/` with asset URLs under `/admin/`.        |
| `npm run build:api` | Builds straight into `../commerce-erp-api/public/admin` (gitignored there). |

The dev server serves the app at `/`. The proxy forwards `/api` and `/sanctum` for every method. It forwards `/login`, `/logout`, `/forgot-password` and `/reset-password` for POST only, because the same paths are also pages in the app.

## Screens

| Path                      | Screen                                                                                                            | Needs            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------- |
| `/login`                  | Sign in                                                                                                           | signed out       |
| `/forgot-password`        | Request a password reset link                                                                                     | signed out       |
| `/reset-password`         | Choose a new password from a reset link                                                                           | anyone           |
| `/`                       | Overview                                                                                                          | signed in        |
| `/products`               | Products list: status tabs, search, category filter, pages                                                        | `catalogue.view` |
| `/products/new`           | Add product: details, options and variants, prices, opening stock, images, save or publish                        | `catalogue.view` |
| `/products/:productId`    | Product detail: edit, publish, unpublish, archive, restore, images, variants, stock history                       | `catalogue.view` |
| `/products/option-types`  | Option types and their values (e.g. Size: S, M)                                                                   | `catalogue.view` |
| `/products/categories`    | Category tree                                                                                                     | `catalogue.view` |
| `/orders`                 | Orders list: status tabs, search by reference or phone, fee-pending filter, pages                                 | `orders.view`    |
| `/orders/:orderId`        | Order detail: confirm, cancel, set the delivery fee, dispatch, complete                                           | `orders.view`    |
| `/deliveries`             | Deliveries list: status tabs, search by reference or tracking number, courier, pages                              | `orders.view`    |
| `/deliveries/:deliveryId` | Delivery detail: in transit, delivered or collected, failed, retry, returned, notes, tracking, complete the order | `orders.view`    |

Changing products also needs `catalogue.manage`; prices need `pricing.manage` and stock needs `inventory.manage`.
Without `catalogue.view` the products screens show "You don't have access to products."
Order and delivery actions need `orders.manage`; without it the sales screens are read-only. Without `orders.view`
they show "You don't have access to orders."

## Testing a reset link locally

In the API `.env`, set `APP_URL=http://localhost:5173` and `MAIL_MAILER=log`. Request a reset from the forgot password page, then open the link from the newest entry in the API's `storage/logs/laravel.log`. It will point at the dev server.

## Going live

See the "Going live" section of the API README (`commerce-erp-api/README.md`).
