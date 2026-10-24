import { AxiosError, AxiosHeaders } from 'axios';

import { getFieldError, getRetryAfterSeconds, isStatus } from '@/utils/apiErrors';

function buildAxiosError(status: number, data: unknown = {}, headers: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('failed', String(status), config, null, {
    status,
    statusText: '',
    data,
    headers,
    config,
  });
}

describe('getFieldError', () => {
  it('returns the first message for the field from a 422 body', () => {
    const error = buildAxiosError(422, {
      message: 'These credentials do not match our records.',
      errors: { email: ['These credentials do not match our records.'] },
    });

    expect(getFieldError(error, 'email')).toBe('These credentials do not match our records.');
  });

  it('returns undefined for another field or a non-Axios error', () => {
    const error = buildAxiosError(422, { message: 'x', errors: { email: ['bad'] } });

    expect(getFieldError(error, 'password')).toBeUndefined();
    expect(getFieldError(new Error('boom'), 'email')).toBeUndefined();
  });
});

describe('getRetryAfterSeconds', () => {
  it('reads the retry-after header as integer seconds', () => {
    expect(getRetryAfterSeconds(buildAxiosError(429, {}, { 'retry-after': '42' }))).toBe(42);
  });

  it('returns undefined when the header is missing or the error is not an Axios error', () => {
    expect(getRetryAfterSeconds(buildAxiosError(429))).toBeUndefined();
    expect(getRetryAfterSeconds(new Error('boom'))).toBeUndefined();
  });
});

describe('isStatus', () => {
  it('matches the response status of an Axios error only', () => {
    expect(isStatus(buildAxiosError(422), 422)).toBe(true);
    expect(isStatus(buildAxiosError(422), 429)).toBe(false);
    expect(isStatus(new Error('boom'), 422)).toBe(false);
  });
});
