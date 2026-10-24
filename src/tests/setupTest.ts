import '@testing-library/jest-dom/vitest';

import { server } from '@/tests/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
});

afterAll(() => server.close());
