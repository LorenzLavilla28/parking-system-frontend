// Wire types mirroring the backend's response envelope and RFC 7807 errors.
// See docs/API.md for the full contract.

export interface ApiResponse<T> {
  data: T;
  meta?: unknown;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  search?: string;
}

/** Normalized representation of a backend error (from Problem Details). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail?: string;
  /** Field-to-messages map for validation failures. */
  readonly errors?: Record<string, string[]>;

  constructor(params: {
    status: number;
    code: string;
    title: string;
    detail?: string;
    errors?: Record<string, string[]>;
  }) {
    super(params.detail || params.title || 'Request failed');
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.title = params.title;
    this.detail = params.detail;
    this.errors = params.errors;
  }

  get isValidation(): boolean {
    return this.code === 'validation_failed' || !!this.errors;
  }
}
