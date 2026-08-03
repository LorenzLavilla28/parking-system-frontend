import axios from 'axios';
import { http } from '@/lib/api/client';

export async function getCurrentTenantLogo(): Promise<Blob | null> {
  try {
    const response = await http.get<Blob>('/api/tenant/branding/logo', { responseType: 'blob' });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}
