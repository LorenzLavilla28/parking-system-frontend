import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bluetooth, CarFront, CircleDot, Wifi, WifiOff } from 'lucide-react';
import { guardApi, type SessionSummary } from './api';
import { useGuardLocations } from './useGuardLocations';
import { EntryTicket } from './EntryTicket';
import { PlateNumberInput } from './PlateNumberInput';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { PhotoCaptureField } from './PhotoCaptureField';
import { normalizePlateForSubmit } from './plate';
import { sessionStatusView } from './sessionStatus';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState, EmptyState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/format';
import { getSavedThermalPrinter, isThermalPrinterConnected, isThermalPrintingAvailable } from '@/lib/printing/thermalPrinter';

export function GuardEntryPage() {
  const queryClient = useQueryClient();
  const { selectedId, selected, locations, isLoading } = useGuardLocations();
  useSessionRealtime({ locationId: selectedId });
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<string>(() => localStorage.getItem('parking.lastVehicleType') ?? 'Car');
  const [color, setColor] = useState('');
  const [duplicate, setDuplicate] = useState<SessionSummary | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastEntry, setLastEntry] = useState<{ plate: string; entryTime: string } | null>(null);
  const [printerConnected, setPrinterConnected] = useState(false);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshPrinterStatus = () => {
      void isThermalPrinterConnected(selectedId).then((value) => {
        if (active) setPrinterConnected(value);
      });
    };

    refreshPrinterStatus();
    window.addEventListener('focus', refreshPrinterStatus);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshPrinterStatus);
    };
  }, [lastEntry, selectedId]);

  const activeSessions = useQuery({
    queryKey: ['guard-entry-active-count', selectedId],
    queryFn: () => guardApi.searchSessions({ locationId: selectedId ?? undefined, activeOnly: true }),
    enabled: !!selectedId,
  });

  const entry = useMutation({
    mutationFn: () =>
      guardApi.recordEntry({
        parkingLocationId: selectedId!,
        plateNumber: normalizePlateForSubmit(plate),
        vehicleType,
        vehicleColor: color.trim() || null,
        entryPhotoUrl: null,
      }),
    onSuccess: (ticket) => {
      localStorage.setItem('parking.lastVehicleType', vehicleType);
      setLastEntry({ plate: ticket.plateNumber, entryTime: ticket.entryTime });
      // Refresh the session lists so the new car shows up without a manual reload,
      // including this page's own active-session count.
      queryClient.invalidateQueries({ queryKey: ['guard-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['guard-entry-active-count'] });
    },
  });

  const duplicateCheck = useMutation({
    mutationFn: () =>
      guardApi.searchSessions({
        locationId: selectedId ?? undefined,
        plate: normalizePlateForSubmit(plate),
        activeOnly: true,
      }),
    onSuccess: (result) => {
      const exact = result.items.find((session) => session.plateNumberRaw.toUpperCase() === normalizePlateForSubmit(plate));
      if (exact) {
        setDuplicate(exact);
        return;
      }
      entry.mutate();
    },
  });

  const resetForm = () => {
    entry.reset();
    setPlate('');
    setColor('');
    setDuplicate(null);
  };

  if (entry.data) {
    return <EntryTicket ticket={entry.data} locationId={selectedId} onDone={resetForm} />;
  }

  const checkingOrRecording = duplicateCheck.isPending || entry.isPending;
  const submitBlockReason = duplicate
    ? 'Resolve the duplicate active session before continuing.'
    : !selectedId
      ? 'Select a working location before recording an entry.'
      : !plate.trim()
        ? 'Enter a plate number to continue.'
        : selected && (activeSessions.data?.items.length ?? 0) >= selected.slotCapacity
          ? 'This location is full. Record an exit before accepting another vehicle.'
        : null;
  const canSubmit = !submitBlockReason && !checkingOrRecording;
  const activeCount = activeSessions.data?.items.length ?? 0;
  const isFull = !!selected && activeCount >= selected.slotCapacity;
  const savedPrinter = getSavedThermalPrinter(selectedId);
  const printerStatus = !isThermalPrintingAvailable()
    ? 'Not supported on this device'
    : printerConnected
      ? 'Connected'
      : savedPrinter
        ? 'Ready to connect'
        : 'Set up on the Printer setup page';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gate operations"
        title="Vehicle entry"
        description="Capture the vehicle details, record the entry, and provide the driver with a ticket."
      />

      {!isLoading && locations.length === 0 ? (
        <EmptyState>You are not assigned to any parking location yet.</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <Card>
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (!canSubmit) return;
                setDuplicate(null);
                duplicateCheck.mutate();
              }}
            >
              <div className="flex items-start gap-3 rounded-lg bg-slate-950 p-4 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700">
                  <CarFront className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">New parking session</p>
                  <p className="text-sm leading-6 text-slate-300">
                    Confirm the vehicle details before recording the entry.
                  </p>
                </div>
              </div>

              <PlateNumberInput value={plate} onChange={setPlate} autoFocus />
              <VehicleTypeSelector value={vehicleType} onChange={setVehicleType} />

              <FormField label="Vehicle color (optional)" htmlFor="color">
                <Input id="color" value={color} onChange={(event) => setColor(event.target.value)} placeholder="White" />
              </FormField>

              <PhotoCaptureField onPlateDetected={setPlate} disabled={checkingOrRecording} />

              {duplicate && (
                <div className="rounded-lg bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200" role="alert">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">An active parking session already exists for {duplicate.plateNumberRaw}.</p>
                      <p className="mt-1 text-sm">Entered: {formatDateTime(duplicate.entryTime)}</p>
                      <p className="text-sm">Status: {sessionStatusView(duplicate.status).label}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setDuplicate(null)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => window.location.assign(`/guard/exit?session=${duplicate.id}`)}>
                      View existing session
                    </Button>
                  </div>
                </div>
              )}

              {duplicateCheck.isError && <ErrorState error={duplicateCheck.error} />}
              {entry.isError && <ErrorState error={entry.error} />}

              {isFull && (
                <div className="rounded-lg bg-amber-50 p-4 text-sm font-semibold text-amber-950 ring-1 ring-amber-200" role="alert">
                  This location is full ({activeCount} / {selected?.slotCapacity} slots).
                </div>
              )}

              {submitBlockReason && (
                <p id="record-entry-help" className="text-sm font-semibold text-slate-600">
                  {submitBlockReason}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                fullWidth
                loading={checkingOrRecording}
                disabled={!canSubmit}
                aria-describedby={submitBlockReason ? 'record-entry-help' : undefined}
              >
                {checkingOrRecording ? 'Recording entry...' : 'Record entry'}
              </Button>
            </form>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-950">Operations status</h2>
                <p className="truncate text-sm font-semibold text-slate-600">{selected?.name ?? 'Select a working location'}</p>
              </div>
              <StatusBadge tone={isOnline ? 'success' : 'danger'} label={isOnline ? 'Online' : 'Offline'} />
            </div>
            <div className="space-y-3">
              <OperationalRow
                label="Network"
                value={isOnline ? 'Internet connection detected' : 'No internet connection detected'}
                icon={isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                badge={<StatusBadge tone={isOnline ? 'success' : 'danger'} label={isOnline ? 'Online' : 'Offline'} />}
              />
              <OperationalRow
                label="Printer"
                value={printerStatus}
                icon={<Bluetooth className="h-4 w-4" />}
                badge={<StatusBadge tone={printerConnected ? 'success' : 'neutral'} label={printerConnected ? 'Connected' : 'Not connected'} />}
              />
              <OperationalRow
                label="Active sessions"
                value={activeSessions.data ? `${activeCount} / ${selected?.slotCapacity ?? '-'}` : activeSessions.isLoading ? 'Loading...' : 'Unable to load'}
                icon={<CircleDot className="h-4 w-4" />}
              />
              <OperationalRow
                label="Most recent entry"
                value={lastEntry ? `${lastEntry.plate} - ${formatDateTime(lastEntry.entryTime)}` : 'No entry recorded yet'}
                icon={<CarFront className="h-4 w-4" />}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function OperationalRow({
  label,
  value,
  badge,
  icon,
}: {
  label: string;
  value: string;
  badge?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex min-w-0 gap-2">
        {icon && <span className="mt-0.5 text-slate-400">{icon}</span>}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}
