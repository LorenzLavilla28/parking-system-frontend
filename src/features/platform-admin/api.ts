import { api, http } from '@/lib/api/client';
import type { PagedResult, PageQuery } from '@/lib/api/types';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionPlan: string;
  defaultCurrency: string;
  defaultTimezone: string;
  createdAt: string;
  updatedAt: string;
  firstLocation?: TenantOnboardingLocation | null;
}

export interface TenantOnboardingLocation {
  id: string;
  name: string;
  slug: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  subscriptionPlan: string;
  defaultCurrency: string;
  defaultTimezone: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  firstLocation: CreateTenantLocationInput;
}

export interface CreateTenantLocationInput {
  name: string;
  slug: string;
  address?: string | null;
  timezone: string;
  exitGraceMinutes: number;
  allowCashPayment: boolean;
}

export interface HealthReadiness {
  status: string;
  database: string;
}

export const SUBSCRIPTION_PLANS = ['Free', 'Starter', 'Growth', 'Enterprise'] as const;
export const TENANT_STATUSES = ['Active', 'Suspended', 'Archived'] as const;

export const platformApi = {
  listTenants: (q?: PageQuery) => api.get<PagedResult<Tenant>>('/api/platform/tenants', { params: q }),
  createTenant: (body: CreateTenantInput) => api.post<Tenant>('/api/platform/tenants', body),
  changeStatus: (id: string, status: string) =>
    api.patch<Tenant>(`/api/platform/tenants/${id}/status`, { status }),
  health: async () => {
    const response = await http.get<HealthReadiness>('/api/health/ready');
    return response.data;
  },
};
