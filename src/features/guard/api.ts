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
  corporateBenefitApplied?: boolean;
  corporateBenefitProgramName?: string | null;
  corporateBenefitMessage?: string | null;
  rateCurrency?: string;
  rateBreakdown?: EntryRateLine[];
}

export interface EntryRateLine {
  code: string;
  description: string;
  amount: number;
}

export interface SessionSummary {
  id: string;
  parkingLocationId: string;
  locationName?: string;
  plateNumberRaw: string;
  vehicleType: string;
  notes: string | null;
  entryTime: string;
  status: string;
  pricingAvailable: boolean;
  currency: string;
  currentFee: number;
  outstanding: number;
  finalFee: number | null;
  totalPaid: number;
  paidExitDeadline: string | null;
  corporateBenefitApplied?: boolean;
}

export interface SessionSearchParams {
  plate?: string;
  locationId?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export type SessionSearchResult = PagedResult<SessionSummary> & {
  attentionCount?: number;
  unpaidCount?: number;
  longRunningCount?: number;
};

export async function listAllSessionPages(
  fetchPage: (params: SessionSearchParams) => Promise<SessionSearchResult>,
  params: Omit<SessionSearchParams, 'page' | 'pageSize'> = {},
): Promise<SessionSearchResult> {
  const pageSize = 200;
  const first = await fetchPage({ ...params, page: 1, pageSize });
  if (first.totalPages <= 1) return first;

  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) => fetchPage({ ...params, page: index + 2, pageSize })),
  );
  const items = [first, ...remaining].flatMap((page) => page.items);
  return { ...first, items, page: 1, pageSize, totalPages: 1 };
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
  notes: string | null;
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
  notes?: string | null;
  entryPhotoUrl?: string | null;
  corporateBenefitProgramId?: string | null;
}

export interface GuardCorporateBenefitOption {
  programId: string;
  programName: string;
  priority: number;
  capacity: number;
  activeAllocations: number;
  availableSlots: number;
  isFull: boolean;
}

export interface PlateScanResponse {
  detected: boolean;
  plateNumber: string | null;
  confidence: number | null;
  ocrConfidence: number | null;
  boundingBox: { left: number; top: number; width: number; height: number } | null;
  imageWidth: number | null;
  imageHeight: number | null;
}

export const guardApi = {
  locations: () => api.get<GuardLocation[]>('/api/guard/locations'),
  scanPlate: (image: Blob | File) => {
    const form = new FormData();
    form.append('image', image, image instanceof File ? image.name : 'camera-frame.jpg');
    return api.post<PlateScanResponse>('/api/guard/plate-scan', form);
  },
  recordEntry: (body: RecordEntryInput) => api.post<EntryTicket>('/api/guard/entries', body),
  corporateBenefits: (locationId: string, vehicleType: string) =>
    api.get<GuardCorporateBenefitOption[]>('/api/guard/entries/corporate-benefits', { params: { locationId, vehicleType } }),
  searchSessions: (params: SessionSearchParams) =>
    api.get<SessionSearchResult>('/api/guard/sessions', { params }),
  getSession: (id: string) => api.get<SessionSummary>(`/api/guard/sessions/${id}`),
  getQr: (id: string) => api.post<SessionQr>(`/api/guard/sessions/${id}/qr`),
  exitStatus: (sessionId: string) => api.get<ExitStatus>(`/api/guard/exits/${sessionId}`),
  approveExit: (body: { sessionId: string; exitPhotoUrl?: string | null; deviceInformation?: string | null; overrideReason?: string | null; cashPaymentAmount?: number | null }) =>
    api.post<ExitApproved>('/api/guard/exits', body),
  recordCash: (body: { sessionId: string; amountReceived: number; deviceInformation?: string | null }) =>
    api.post<CashReceipt>('/api/guard/cash-payments', body),
};

export const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Van', 'Truck', 'Other'] as const;
