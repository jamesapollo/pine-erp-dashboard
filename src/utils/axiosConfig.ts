import axios, { type InternalAxiosRequestConfig } from 'axios';

type RetryableRequestConfig = InternalAxiosRequestConfig & { csrfRetried?: boolean };

const CSRF_COOKIE_URL = '/sanctum/csrf-cookie';
const UNAUTHENTICATED_EXEMPT_URLS = ['/api/v1/me', '/logout'];

export const axiosInstance = axios.create({
  baseURL: '',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

export async function ensureCsrfCookie(): Promise<void> {
  await axiosInstance.get(CSRF_COOKIE_URL);
}

let unauthenticatedHandler: () => void = () => {};

export function setUnauthenticatedHandler(handler: () => void): void {
  unauthenticatedHandler = handler;
}

axiosInstance.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.config) throw error;

  const status = error.response?.status;
  const config: RetryableRequestConfig = error.config;

  if (status === 419 && !config.csrfRetried) {
    config.csrfRetried = true;
    await ensureCsrfCookie();
    return axiosInstance.request(config);
  }

  if (status === 401 && !UNAUTHENTICATED_EXEMPT_URLS.includes(config.url ?? '')) {
    unauthenticatedHandler();
  }

  throw error;
});
