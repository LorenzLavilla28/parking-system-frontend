import { api } from '@/lib/api/client';
import type { PagedResult, PageQuery } from '@/lib/api/types';
import type { SessionSummary } from '@/features/guard/api';
import { http } from '@/lib/api/client';

// ---- Locations -------------------------------------------------------------
export interface Location {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  address: string | null;
  timezone: string;
  status: string;
  allowCashPayment: boolean;
  slotCapacity?: number;
  activeRatePlanId?: string | null;
  publicQrCodeUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationInput {
  name: string;
  slug?: string;
  address?: string | null;
  timezone: string;
  allowCashPayment: boolean;
  slotCapacity: number;
  ratePlanId?: string | null;
  clearRatePlan?: boolean;
}

export interface LocationQuota {
  subscriptionPlan: string;
  activeLocations: number;
  maximumLocations: number | null;
  maximumSlotsPerLocation: number | null;
  canCreateLocation: boolean;
  additionalSlotCapacity: number;
  effectiveMaximumSlotsPerLocation: number | null;
}

export interface PayMongoConnection {
  environment: string;
  status: string;
  payMongoAccountId: string | null;
  lastValidatedAt: string | null;
  lastError: string | null;
  webhookUrl: string | null;
}

// ---- Users -----------------------------------------------------------------
export interface User {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roles: string[];
  assignedLocationIds: string[];
  createdAt: string;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roles: string[];
  assignedLocationIds: string[];
}

export interface UpdateUserInput {
  firstName: string;
  lastName: string;
  roles: string[];
  assignedLocationIds: string[];
  isActive: boolean;
}

// ---- Dashboard reporting --------------------------------------------------
export interface DashboardSummary {
  activeSessions: number;
  paidAwaitingExit: number;
  unpaidSessions: number;
  overGraceSessions: number;
  todayEntries: number;
  todayExits: number;
  todayRevenue: number;
  currency: string;
}

export interface RevenuePoint {
  date: string;
  amount: number;
  paymentCount: number;
}

export interface PaymentMixItem {
  key: string;
  label: string;
  amount: number;
  count: number;
}

export interface DashboardReport {
  periodStart: string;
  periodEnd: string;
  summary: DashboardSummary;
  revenue: RevenuePoint[];
  paymentMix: PaymentMixItem[];
}

export interface OperationsPaymentBreakdown {
  label: string;
  count: number;
  amount: number;
}

export interface OperationsAttentionItem {
  severity: string;
  title: string;
  detail: string;
}

export interface OperationsSummary {
  tenantId: string;
  tenantName: string;
  currency: string;
  timeZone: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  sessionEntries: number;
  sessionExits: number;
  activeSessions: number;
  revenue: number;
  overstays: number;
  pendingPayments: number;
  pendingAmount: number;
  failedPayments: number;
  failedAmount: number;
  failedWebhooks: number;
  paymentBreakdown: OperationsPaymentBreakdown[];
  attention: OperationsAttentionItem[];
}

export interface OperationsSummaryEmailResponse {
  recipientsQueued: number;
  periodStart: string;
  periodEnd: string;
}

export interface PaymentQuery {
  search?: string;
  status?: string;
  provider?: string;
  paymentMethod?: string;
  locationId?: string;
  sessionId?: string;
  from?: string;
  to?: string;
  sortBy?: 'time' | 'amount';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaymentSummary {
  id: string;
  parkingSessionId: string;
  parkingLocationId: string;
  locationName: string;
  plateNumberRaw: string;
  status: string;
  provider: string;
  paymentMethod: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  receiptNumber: string | null;
  providerCheckoutSessionId: string | null;
  providerPaymentId: string | null;
  customerEmail: string | null;
  recordedByGuardId: string | null;
  sessionStatus: string;
  entryTime: string;
  exitTime: string | null;
  finalFee: number | null;
  totalPaid: number;
  paidExitDeadline: string | null;
}

export interface PaymentAudit {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  oldValuesJson: string | null;
  newValuesJson: string | null;
  reason: string | null;
  ipAddress: string | null;
  deviceInformation: string | null;
}

export interface PaymentWebhook {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  paymentId: string | null;
  receivedAt: string;
  processedAt: string | null;
  processingStatus: string;
  failureReason: string | null;
}

export interface PaymentTimelineItem {
  at: string;
  type: string;
  label: string;
  detail: string | null;
  status: string | null;
}

export interface PaymentDetail {
  payment: PaymentSummary;
  session: {
    id: string;
    plateNumberRaw: string;
    vehicleType: string;
    locationName: string;
    entryTime: string;
    exitTime: string | null;
    status: string;
    finalFee: number | null;
    totalPaid: number;
    paidExitDeadline: string | null;
    currentFee?: number | null;
    currentOutstanding?: number | null;
  };
  quote: {
    id: string;
    baseAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency: string;
    createdAt: string;
    expiresAt: string;
    status: string;
    pricingBreakdownJson: string;
  } | null;
  timeline: PaymentTimelineItem[];
  audit: PaymentAudit[];
  webhooks: PaymentWebhook[];
}

// ---- Rate plans ------------------------------------------------------------
export interface RatePlan {
  id: string;
  parkingLocationId: string | null;
  name: string;
  description: string;
  status: string;
  currentVersionNumber: number | null;
  paidExitGraceMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  currentRulesJson?: string | null;
}

export interface RatePlanVersion {
  id: string;
  ratePlanId: string;
  versionNumber: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  rulesJson: string;
  createdAt: string;
}

export const adminApi = {
  // Dashboard reporting
  getDashboardReport: (days = 7) => api.get<DashboardReport>('/api/tenant/dashboard', { params: { days } }),
  getOperationsSummary: (hours = 3) =>
    api.get<OperationsSummary>('/api/tenant/reports/operations-summary', { params: { hours } }),
  sendOperationsSummaryEmail: (hours = 3) =>
    api.post<OperationsSummaryEmailResponse>('/api/tenant/reports/operations-summary/email', undefined, { params: { hours } }),

  // Tenant-owned payment credentials
  getPayMongoConnections: () => api.get<PayMongoConnection[]>('/api/tenant/payments/paymongo'),
  connectPayMongo: (body: {
    environment: string;
    secretKey: string;
    webhookSecret: string;
    payMongoAccountId?: string;
  }) => api.post<PayMongoConnection>('/api/tenant/payments/paymongo/connect', body),
  disconnectPayMongo: (environment: string) =>
    api.post<PayMongoConnection>('/api/tenant/payments/paymongo/disconnect', undefined, { params: { environment } }),

  // Locations
  listLocations: (q?: PageQuery) => api.get<PagedResult<Location>>('/api/tenant/locations', { params: q }),
  getLocationQuota: () => api.get<LocationQuota>('/api/tenant/locations/quota'),
  createLocation: (body: LocationInput) => api.post<Location>('/api/tenant/locations', body),
  updateLocation: (id: string, body: Omit<LocationInput, 'slug'>) =>
    api.put<Location>(`/api/tenant/locations/${id}`, body),
  archiveLocation: (id: string) => api.del<void>(`/api/tenant/locations/${id}`),
  restoreLocation: (id: string) => api.post<void>(`/api/tenant/locations/${id}/restore`, undefined),

  // Users
  listUsers: (q?: PageQuery) => api.get<PagedResult<User>>('/api/tenant/users', { params: q }),
  createUser: (body: CreateUserInput) => api.post<User>('/api/tenant/users', body),
  updateUser: (id: string, body: UpdateUserInput) => api.put<User>(`/api/tenant/users/${id}`, body),

  // Rate plans
  listRatePlans: (locationId?: string, q?: PageQuery) =>
    api.get<PagedResult<RatePlan>>('/api/tenant/rate-plans', { params: { ...q, locationId } }),
  createRatePlan: (body: { name: string; description: string; rulesJson: string }) =>
    api.post<RatePlan>('/api/tenant/rate-plans', body),
  listVersions: (id: string) => api.get<RatePlanVersion[]>(`/api/tenant/rate-plans/${id}/versions`),
  addVersion: (id: string, rulesJson: string) =>
    api.post<RatePlanVersion>(`/api/tenant/rate-plans/${id}/versions`, { rulesJson }),
  archiveRatePlan: (id: string) => api.del<void>(`/api/tenant/rate-plans/${id}`),

  // Sessions (admins are permitted on the guard endpoint).
  listSessions: (params: { plate?: string; activeOnly?: boolean; locationId?: string }) =>
    api.get<PagedResult<SessionSummary>>('/api/guard/sessions', { params }),

  listPayments: (params: PaymentQuery) =>
    api.get<PagedResult<PaymentSummary>>('/api/tenant/payments', { params }),
  getPayment: (id: string) => api.get<PaymentDetail>(`/api/tenant/payments/${id}`),
  exportPayments: (params: PaymentQuery) =>
    http.get('/api/tenant/payments/export', { params, responseType: 'blob' }),
};
