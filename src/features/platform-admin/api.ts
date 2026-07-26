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
  maximumLocations?: number;
  maximumSlotsPerLocation?: number | null;
  additionalSlotCapacity: number;
  effectiveMaximumSlotsPerLocation?: number | null;
  activeLocationCount?: number;
  monthlyPrice?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantAuditLog {
  id: string;
  action: string;
  administrator: string;
  reason?: string | null;
  oldValuesJson?: string | null;
  newValuesJson?: string | null;
  createdAt: string;
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
}

export interface HealthReadiness {
  status: string;
  database: string;
}

export const SUBSCRIPTION_PLANS = ['Starter', 'Growth', 'Enterprise', 'Custom'] as const;
export const TENANT_STATUSES = ['Active', 'Suspended', 'Archived'] as const;

export const platformApi = {
  listTenants: (q?: PageQuery) => api.get<PagedResult<Tenant>>('/api/platform/tenants', { params: q }),
  createTenant: (body: CreateTenantInput) => api.post<Tenant>('/api/platform/tenants', body),
  changeStatus: (id: string, status: string, reason?: string) =>
    api.patch<Tenant>(`/api/platform/tenants/${id}/status`, { status, reason }),
  changePlan: (id: string, subscriptionPlan: string, reason?: string, effectiveDate = 'Immediately') =>
    api.patch<Tenant>(`/api/platform/tenants/${id}/plan`, { subscriptionPlan, reason, effectiveDate }),
  updateCapacityAddon: (id: string, additionalSlotCapacity: number, reason?: string) =>
    api.patch<Tenant>(`/api/platform/tenants/${id}/capacity-addon`, { additionalSlotCapacity, reason }),
  getAuditHistory: (id: string) => api.get<TenantAuditLog[]>(`/api/platform/tenants/${id}/audit-history`),
  health: async () => {
    const response = await http.get<HealthReadiness>('/api/health/ready');
    return response.data;
  },
};
