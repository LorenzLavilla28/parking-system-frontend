import { AxiosError } from 'axios';
import { ApiError } from './types';

/** Converts an Axios error (carrying RFC 7807 Problem Details) into a typed ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data as
      | {
          title?: string;
          detail?: string;
          code?: string;
          errors?: Record<string, string[]>;
        }
      | undefined;

    if (body && (body.title || body.code || body.errors)) {
      return new ApiError({
        status,
        code: body.code ?? 'error',
        title: body.title ?? 'Request failed',
        detail: body.detail,
        errors: body.errors,
      });
    }

    if (status === 0) {
      return new ApiError({
        status,
        code: 'network_error',
        title: 'Network error',
        detail: 'Could not reach the server. Check your connection and try again.',
      });
    }

    return new ApiError({ status, code: 'error', title: error.message });
  }

  return new ApiError({ status: 0, code: 'unknown', title: 'Unexpected error' });
}
