import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { guardApi } from './api';
import { useGuardLocationStore } from './locationStore';

/** Loads operable locations and keeps a valid selection (auto-picks the first). */
export function useGuardLocations() {
  const query = useQuery({ queryKey: ['guard-locations'], queryFn: guardApi.locations });
  const selectedId = useGuardLocationStore((s) => s.selectedLocationId);
  const setLocation = useGuardLocationStore((s) => s.setLocation);

  const locations = query.data ?? [];
  const valid = locations.some((l) => l.id === selectedId);

  useEffect(() => {
    if (locations.length > 0 && !valid) {
      setLocation(locations[0].id);
    }
  }, [locations, valid, setLocation]);

  const effectiveId = valid ? selectedId : (locations[0]?.id ?? null);

  return {
    ...query,
    locations,
    selectedId: effectiveId,
    selected: locations.find((l) => l.id === effectiveId) ?? null,
    setLocation,
  };
}
