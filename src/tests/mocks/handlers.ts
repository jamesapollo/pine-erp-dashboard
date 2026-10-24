import { http, HttpResponse } from 'msw';

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
];
