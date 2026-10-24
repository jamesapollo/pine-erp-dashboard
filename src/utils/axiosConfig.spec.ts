import { http, HttpResponse } from 'msw';

import { server } from '@/tests/mocks/server';
import { mockEndpoints } from '@/tests/mocks/endpoints';
import { axiosInstance, setUnauthenticatedHandler } from '@/utils/axiosConfig';

describe('axiosInstance', () => {
  afterEach(() => setUnauthenticatedHandler(() => {}));

  it('sends the XSRF cookie back as a header', async () => {
    document.cookie = 'XSRF-TOKEN=abc%3D';
    let received: string | null = null;
    server.use(
      http.post(mockEndpoints.logout, ({ request }) => {
        received = request.headers.get('x-xsrf-token');
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await axiosInstance.post(mockEndpoints.logout);

    expect(received).toBe('abc=');
  });

  it('refreshes the CSRF cookie once and retries after a 419', async () => {
    let csrfCalls = 0;
    let loginCalls = 0;
    server.use(
      http.get(mockEndpoints.csrfCookie, () => {
        csrfCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(mockEndpoints.login, () => {
        loginCalls += 1;
        return new HttpResponse(null, { status: loginCalls === 1 ? 419 : 204 });
      }),
    );

    await expect(axiosInstance.post(mockEndpoints.login)).resolves.toBeDefined();

    expect(csrfCalls).toBe(1);
    expect(loginCalls).toBe(2);
  });

  it('gives up after a second 419', async () => {
    let csrfCalls = 0;
    server.use(
      http.get(mockEndpoints.csrfCookie, () => {
        csrfCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(mockEndpoints.login, () => new HttpResponse(null, { status: 419 })),
    );

    await expect(axiosInstance.post(mockEndpoints.login)).rejects.toMatchObject({
      response: { status: 419 },
    });

    expect(csrfCalls).toBe(1);
  });

  it('calls the unauthenticated handler on a 401 from a store request', async () => {
    const handler = vi.fn();
    setUnauthenticatedHandler(handler);
    server.use(
      http.get('/api/v1/stores/1', () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    );

    await expect(axiosInstance.get('/api/v1/stores/1')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call the unauthenticated handler for /api/v1/me', async () => {
    const handler = vi.fn();
    setUnauthenticatedHandler(handler);

    await expect(axiosInstance.get(mockEndpoints.me)).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
