import { api } from '@/lib/api/client';
import type { PagedResult } from '@/lib/api/types';

export interface GuardLocation {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  allowCashPayment: boolean;
  slotCapacity: number;
}

export interface EntryTicket {
  sessionId: string;
  plateNumber: string;
  vehicleType: string;
  entryTime: string;
  ticketCode: string;
  paymentUrl: string;
  qrCodeDataUri: string;
  locationName: string;
}

export interface SessionSummary {
  id: string;
  parkingLocationId: string;
  locationName?: string;
  plateNumberRaw: string;
  vehicleType: string;
  vehicleColor: string | null;
  entryTime: string;
  status: string;
  pricingAvailable: boolean;
  currency: string;
  currentFee: number;
  outstanding: number;
  finalFee: number | null;
  totalPaid: number;
  paidExitDeadline: string | null;
}

export interface SessionQr {
  sessionId: string;
  ticketCode: string;
  paymentUrl: string;
  qrCodeDataUri: string;
}

export interface ExitStatus {
  sessionId: string;
  plateNumberRaw: string;
  vehicleType: string;
  status: string;
  decision: 'Paid' | 'Free' | 'NotPaid' | 'AdditionalPaymentRequired' | 'Closed';
  pricingAvailable: boolean;
  currency: string;
  currentFee: number;
  totalPaid: number;
  outstanding: number;
  entryTime: string;
  paidExitDeadline: string | null;
  canApproveExit: boolean;
}

export interface ExitApproved {
  sessionId: string;
  status: string;
  finalFee: number;
  totalPaid: number;
  exitTime: string;
}

export interface CashReceipt {
  paymentId: string;
  receiptNumber: string;
  amountDue: number;
  amountReceived: number;
  change: number;
  currency: string;
  paidAt: string;
  sessionStatus: string;
  paidExitDeadline: string | null;
}

export interface RecordEntryInput {
  parkingLocationId: string;
  plateNumber: string;
  vehicleType: string;
  vehicleColor?: string | null;
  entryPhotoUrl?: string | null;
}

export const guardApi = {
  locations: () => api.get<GuardLocation[]>('/api/guard/locations'),
  recordEntry: (body: RecordEntryInput) => api.post<EntryTicket>('/api/guard/entries', body),
  searchSessions: (params: { plate?: string; locationId?: string; activeOnly?: boolean; page?: number }) =>
    api.get<PagedResult<SessionSummary>>('/api/guard/sessions', { params }),
  getSession: (id: string) => api.get<SessionSummary>(`/api/guard/sessions/${id}`),
  getQr: (id: string) => api.post<SessionQr>(`/api/guard/sessions/${id}/qr`),
  exitStatus: (sessionId: string) => api.get<ExitStatus>(`/api/guard/exits/${sessionId}`),
  approveExit: (body: { sessionId: string; exitPhotoUrl?: string | null; deviceInformation?: string | null; overrideReason?: string | null }) =>
    api.post<ExitApproved>('/api/guard/exits', body),
  recordCash: (body: { sessionId: string; amountReceived: number; deviceInformation?: string | null }) =>
    api.post<CashReceipt>('/api/guard/cash-payments', body),
};

export const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Van', 'Truck', 'Other'] as const;
