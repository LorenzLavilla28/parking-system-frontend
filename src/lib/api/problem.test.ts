import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { toApiError } from './problem';
import { ApiError } from './types';

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return err;
}

describe('toApiError', () => {
  it('maps a Problem Details body to ApiError fields', () => {
    const err = toApiError(
      axiosErrorWith(400, {
        title: 'Validation failed',
        detail: 'One or more validation errors occurred.',
        code: 'validation_failed',
        errors: { email: ['Email is required'] },
      }),
    );

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_failed');
    expect(err.isValidation).toBe(true);
    expect(err.errors?.email?.[0]).toBe('Email is required');
  });

  it('maps a 401 with a code', () => {
    const err = toApiError(axiosErrorWith(401, { title: 'Unauthorized', code: 'unauthorized' }));
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
    expect(err.isValidation).toBe(false);
  });

  it('produces a network error when there is no response', () => {
    const err = toApiError(new AxiosError('Network Error'));
    expect(err.code).toBe('network_error');
    expect(err.status).toBe(0);
  });

  it('passes through an existing ApiError', () => {
    const original = new ApiError({ status: 409, code: 'conflict', title: 'Conflict' });
    expect(toApiError(original)).toBe(original);
  });
});
