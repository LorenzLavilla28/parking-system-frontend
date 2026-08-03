import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore, authToken, refreshToken } from '@/lib/auth/store';
import type { AuthSession } from '@/lib/auth/types';
import { toApiError } from './problem';
import type { ApiResponse } from './types';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export function apiUrl(path: string) {
  return new URL(path, baseURL).toString();
}

/** Bare client used for the refresh call so it never re-enters the interceptor. */
const bare = axios.create({ baseURL });

export const http: AxiosInstance = axios.create({ baseURL });

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: concurrent callers share one refresh round-trip.
let refreshing: Promise<AuthSession | null> | null = null;

async function performSessionRefresh(): Promise<AuthSession | null> {
  const token = refreshToken();
  if (!token) return null;

  try {
    const res = await bare.post<ApiResponse<AuthSession>>('/api/auth/refresh', {
      refreshToken: token,
    });
    const s = res.data.data;
    useAuthStore.getState().setSession(s);
    return s;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

export async function refreshAuthSession(): Promise<AuthSession | null> {
  refreshing ??= performSessionRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const isAuthCall = typeof config?.url === 'string' && config.url.includes('/api/auth/');

    if (status === 401 && config && !config._retried && !isAuthCall && refreshToken()) {
      config._retried = true;
      const refreshedSession = await refreshAuthSession();
      if (refreshedSession) {
        config.headers = { ...config.headers, Authorization: `Bearer ${refreshedSession.accessToken}` };
        return http(config);
      }
    }

    return Promise.reject(error);
  },
);

/** Performs a request and returns the unwrapped `data` payload, throwing ApiError on failure. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await http.request<ApiResponse<T>>(config);
    return res.data.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'GET', url }),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'POST', url, data: body }),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PUT', url, data: body }),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    request<T>({ ...config, method: 'PATCH', url, data: body }),
  del: <T>(url: string, config?: AxiosRequestConfig) => request<T>({ ...config, method: 'DELETE', url }),
};
