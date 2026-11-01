import { isAxiosError } from 'axios';

import { type ValidationErrorBody } from '@/types/apiErrors';

export function isStatus(error: unknown, status: number): boolean {
  return isAxiosError(error) && error.response?.status === status;
}

export function getFieldError(error: unknown, field: string): string | undefined {
  if (!isAxiosError<Partial<ValidationErrorBody>>(error)) return undefined;
  return error.response?.data?.errors?.[field]?.[0];
}

export function getRetryAfterSeconds(error: unknown): number | undefined {
  if (!isAxiosError(error)) return undefined;
  const value: unknown = error.response?.headers?.['retry-after'];
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return undefined;
  return Number.parseInt(value, 10);
}

export function getTooManyRequestsMessage(error: unknown): string {
  const seconds = getRetryAfterSeconds(error);
  return seconds === undefined
    ? 'Too many requests. Try again in a minute.'
    : `Too many requests. Try again in ${seconds} seconds.`;
}

export function getFirstValidationMessage(error: unknown): string | undefined {
  if (!isAxiosError<Partial<ValidationErrorBody>>(error)) return undefined;
  const messages = Object.values(error.response?.data?.errors ?? {});
  return messages[0]?.[0];
}

export function getActionErrorMessage(error: unknown): string {
  if (isStatus(error, 403)) return "You don't have permission to do that.";
  if (isStatus(error, 422) && isAxiosError<Partial<ValidationErrorBody>>(error)) {
    const message = getFirstValidationMessage(error) ?? error.response?.data?.message;
    if (message) return message;
  }
  return 'Something went wrong. Try again.';
}
