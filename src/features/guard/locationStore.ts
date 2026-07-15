import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GuardLocationState {
  selectedLocationId: string | null;
  setLocation: (id: string) => void;
}

/** The guard's currently-selected working location, persisted across reloads. */
export const useGuardLocationStore = create<GuardLocationState>()(
  persist(
    (set) => ({
      selectedLocationId: null,
      setLocation: (id) => set({ selectedLocationId: id }),
    }),
    { name: 'parkingsaas.guard.location' },
  ),
);
