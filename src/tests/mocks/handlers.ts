import { http, HttpResponse } from 'msw';

import { buildPaginated } from '@/tests/fixtures/catalogue';
import { mockEndpoints } from '@/tests/mocks/endpoints';

export const handlers = [
  http.get(mockEndpoints.csrfCookie, () => new HttpResponse(null, { status: 204 })),
  http.get(mockEndpoints.me, () =>
    HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
  ),
  http.post(mockEndpoints.login, () => new HttpResponse(null, { status: 204 })),
  http.post(mockEndpoints.logout, () => new HttpResponse(null, { status: 204 })),
  http.post(mockEndpoints.forgotPassword, () => new HttpResponse(null, { status: 204 })),
  http.post(mockEndpoints.resetPassword, () => new HttpResponse(null, { status: 204 })),
  http.get(mockEndpoints.products, () => HttpResponse.json(buildPaginated([]))),
  http.get(mockEndpoints.optionTypes, () => HttpResponse.json({ data: [] })),
  http.get(mockEndpoints.categories, () => HttpResponse.json({ data: [] })),
  http.get(mockEndpoints.stockMovements, () => HttpResponse.json(buildPaginated([]))),
  http.get(mockEndpoints.staff, () => HttpResponse.json({ data: [] })),
  http.get(mockEndpoints.roles, () => HttpResponse.json({ data: [] })),
  http.get(mockEndpoints.permissions, () => HttpResponse.json({ data: [] })),
  http.get(mockEndpoints.orders, () => HttpResponse.json(buildPaginated([]))),
  http.get(mockEndpoints.enquiries, () => HttpResponse.json(buildPaginated([]))),
];
