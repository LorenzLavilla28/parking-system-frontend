import { api } from '@/lib/api/client';

export interface PublicLocation {
  slug: string;
  name: string;
  address: string | null;
  logoUrl: string | null;
}

export interface PlateLookupResult {
  outcome: 'found' | 'multiple' | 'not_found' | 'captcha_required';
  publicToken: string | null;
  captchaRequired: boolean;
}

export interface PublicSession {
  /** Empty/null means the session cannot be safely verified for payment. */
  plateNumber: string | null;
  vehicleType: string;
  locationName: string;
  entryTime: string;
  status: string;
  paymentStatus: string;
  currentFee: number | null;
  paidExitDeadline: string | null;
}

export interface FeeBreakdownItem {
  code: string;
  description: string;
  amount: number;
}

export interface CurrentFee {
  pricingAvailable: boolean;
  currency: string;
  baseAmount: number;
  additionalAmount: number;
  discountAmount: number;
  totalAmount: number;
  outstanding: number;
  entryTime: string;
  calculationTime: string;
  breakdown: FeeBreakdownItem[];
  onlinePaymentAvailable: boolean;
  cashPaymentAvailable: boolean;
}

export interface FeeQuote {
  id: string;
  currency: string;
  totalAmount: number;
  createdAt: string;
  expiresAt: string;
  status: string;
  breakdown: FeeBreakdownItem[];
}

export interface Checkout {
  paymentReference: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
}

export interface PaymentStatus {
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  paidExitDeadline: string | null;
}

export const publicApi = {
  getLocation: (slug: string) => api.get<PublicLocation>(`/api/customer/locations/${slug}`),
  lookupPlate: (slug: string, body: { plateNumber: string; captchaToken: string | null }) =>
    api.post<PlateLookupResult>(`/api/customer/locations/${slug}/lookup`, body),
  getSession: (token: string) => api.get<PublicSession>(`/api/customer/sessions/${token}`),
  getCurrentFee: (token: string) => api.get<CurrentFee>(`/api/customer/sessions/${token}/fee`),
  createQuote: (publicToken: string) => api.post<FeeQuote>('/api/customer/fee-quotes', { publicToken }),
  createCheckout: (body: { feeQuoteId: string; email: string | null }) =>
    api.post<Checkout>('/api/customer/payments', body),
  getPaymentStatus: (reference: string) =>
    api.get<PaymentStatus>(`/api/customer/payments/${reference}/status`),
};
