import { describe, expect, it, vi } from 'vitest';
import { listAllSessionPages, type SessionSearchResult } from './api';

function result(page: number, totalPages: number): SessionSearchResult {
  return {
    items: [{
      id: `session-${page}`,
      parkingLocationId: 'location-1',
      locationName: 'Lot',
      plateNumberRaw: `ABC ${page}`,
      vehicleType: 'Car',
      notes: null,
      entryTime: `2026-09-14T0${page}:00:00.000Z`,
      status: 'ActiveUnpaid',
      pricingAvailable: true,
      currency: 'PHP',
      currentFee: 50,
      outstanding: 50,
      finalFee: null,
      totalPaid: 0,
      paidExitDeadline: null,
    }],
    page,
    pageSize: 200,
    totalCount: totalPages,
    totalPages,
    attentionCount: totalPages,
    unpaidCount: totalPages,
    longRunningCount: 0,
  };
}

describe('listAllSessionPages', () => {
  it('loads every backend page before client-side filtering and pagination', async () => {
    const fetchPage = vi.fn(async ({ page = 1 }: { page?: number }) => result(page, 3));

    const all = await listAllSessionPages(fetchPage, { locationId: 'location-1', activeOnly: true });

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { locationId: 'location-1', activeOnly: true, page: 1, pageSize: 200 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, { locationId: 'location-1', activeOnly: true, page: 2, pageSize: 200 });
    expect(fetchPage).toHaveBeenNthCalledWith(3, { locationId: 'location-1', activeOnly: true, page: 3, pageSize: 200 });
    expect(all.items.map((item) => item.id)).toEqual(['session-1', 'session-2', 'session-3']);
    expect(all.totalCount).toBe(3);
  });
});
