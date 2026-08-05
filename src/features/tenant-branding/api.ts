import { http } from '@/lib/api/client';

export async function getCurrentTenantLogo(): Promise<Blob | null> {
  try {
    const response = await http.get<Blob>('/api/tenant/branding/logo', { responseType: 'blob' });
    if (response.status === 204 || !response.data || response.data.size === 0) {
      return null;
    }

    return response.data;
  } catch {
    // Branding is optional. Authentication and refresh are handled by the shared
    // HTTP client; any remaining storage/network failure should use the text mark.
    return null;
  }
}
