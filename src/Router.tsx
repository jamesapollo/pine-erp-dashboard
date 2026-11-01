import { type RouteObject } from 'react-router-dom';

import { App } from '@/App';
import { GuestRoute } from '@/components/auth/GuestRoute';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { AppShell } from '@/components/layout/AppShell';
import { ROUTES } from '@/constants/routes';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { CategoriesPage } from '@/pages/products/CategoriesPage';
import { OptionTypesPage } from '@/pages/products/OptionTypesPage';
import { ProductDetailRoute } from '@/pages/products/ProductDetailRoute';
import { ProductNewPage } from '@/pages/products/ProductNewPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { OrderDetailRoute } from '@/pages/sales/OrderDetailRoute';
import { DeliveriesPage } from '@/pages/sales/DeliveriesPage';
import { OrdersPage } from '@/pages/sales/OrdersPage';
import { type RouteHandle } from '@/types/routeHandle';

const productsCrumbs = ['Catalogue', 'Products'];
const ordersCrumbs = ['Sales', 'Orders'];
const deliveriesCrumbs = ['Sales', 'Deliveries'];

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
                  <RequirePermission
                    slug="orders.view"
                    message="You don't have access to orders."
                  />
                ),
                children: [
                  {
                    path: ROUTES.ORDERS,
                    element: <OrdersPage />,
                    handle: { crumbs: ordersCrumbs } satisfies RouteHandle,
                  },
                  {
                    path: ROUTES.DELIVERIES,
                    element: <DeliveriesPage />,
                    handle: { crumbs: deliveriesCrumbs } satisfies RouteHandle,
                  },
                  {
                    path: ROUTES.ORDER_DETAIL,
                    element: <OrderDetailRoute />,
                    handle: {
                      crumbs: ordersCrumbs,
                      trailingCrumb: 'orderReference',
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
                  {
                    element: (
                      <RequirePermission
                        slug="catalogue.manage"
                        message="You don't have permission to do that."
                      />
                    ),
                    children: [
                      {
                        path: ROUTES.PRODUCT_NEW,
                        element: <ProductNewPage />,
                        handle: { crumbs: [...productsCrumbs, 'New'] } satisfies RouteHandle,
                      },
                    ],
                  },
                  {
                    path: ROUTES.OPTION_TYPES,
                    element: <OptionTypesPage />,
                    handle: { crumbs: [...productsCrumbs, 'Option types'] } satisfies RouteHandle,
                  },
                  {
                    path: ROUTES.CATEGORIES,
                    element: <CategoriesPage />,
                    handle: { crumbs: [...productsCrumbs, 'Categories'] } satisfies RouteHandle,
                  },
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
