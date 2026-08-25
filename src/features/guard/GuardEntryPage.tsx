import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bluetooth, CarFront, Check, ChevronDown, CircleDot, Wifi, WifiOff } from 'lucide-react';
import { guardApi, type GuardCorporateBenefitOption, type SessionSummary } from './api';
import { useGuardLocations } from './useGuardLocations';
import { EntryTicket } from './EntryTicket';
import { PlateNumberInput } from './PlateNumberInput';
import { VehicleTypeSelector } from './VehicleTypeSelector';
import { PhotoCaptureField } from './PhotoCaptureField';
import { normalizePlateForSubmit } from './plate';
import { sessionStatusView } from './sessionStatus';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
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
  const [notes, setNotes] = useState('');
  const [corporateBenefitProgramId, setCorporateBenefitProgramId] = useState('');
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

  const corporateBenefits = useQuery({
    queryKey: ['guard-corporate-benefits', selectedId, vehicleType],
    queryFn: () => guardApi.corporateBenefits(selectedId!, vehicleType),
    enabled: !!selectedId,
  });

  useEffect(() => {
    setCorporateBenefitProgramId('');
  }, [selectedId, vehicleType]);

  const entry = useMutation({
    mutationFn: () =>
      guardApi.recordEntry({
        parkingLocationId: selectedId!,
        plateNumber: normalizePlateForSubmit(plate),
        vehicleType,
        notes: notes.trim() || null,
        entryPhotoUrl: null,
        corporateBenefitProgramId: corporateBenefitProgramId || null,
      }),
    onSuccess: (ticket) => {
      localStorage.setItem('parking.lastVehicleType', vehicleType);
      setLastEntry({ plate: ticket.plateNumber, entryTime: ticket.entryTime });
      // Refresh the session lists so the new car shows up without a manual reload,
      // including this page's own active-session count.
      queryClient.invalidateQueries({ queryKey: ['guard-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['guard-entry-active-count'] });
      queryClient.invalidateQueries({ queryKey: ['guard-corporate-benefits', selectedId, vehicleType] });
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
    setNotes('');
    setCorporateBenefitProgramId('');
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
        : selected && (activeSessions.data?.totalCount ?? activeSessions.data?.items.length ?? 0) >= selected.slotCapacity
          ? 'This location is full. Record an exit before accepting another vehicle.'
        : null;
  const canSubmit = !submitBlockReason && !checkingOrRecording;
  const activeCount = activeSessions.data?.totalCount ?? activeSessions.data?.items.length ?? 0;
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

              <CorporateBenefitSelector
                options={corporateBenefits.data ?? []}
                value={corporateBenefitProgramId}
                onChange={setCorporateBenefitProgramId}
                loading={corporateBenefits.isLoading}
              />
              {corporateBenefits.isError && <ErrorState error={corporateBenefits.error} />}

              <FormField label="Notes (optional)" htmlFor="notes">
                <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="VIP guest, reserved space, or other instructions" maxLength={500} rows={3} />
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
                      {duplicate.notes && <p className="mt-2 rounded-md bg-white/70 px-3 py-2 text-sm font-medium ring-1 ring-amber-200">Guard note: {duplicate.notes}</p>}
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

function CorporateBenefitSelector({
  options,
  value,
  onChange,
  loading,
}: {
  options: GuardCorporateBenefitOption[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.programId === value);

  if (!loading && options.length === 0) return null;
  return (
    <div className="relative space-y-1.5">
      <label htmlFor="corporate-benefit" className="flex items-center gap-2 text-sm font-bold text-slate-800">
        Corporate benefit
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Optional</span>
      </label>
      <button
        id="corporate-benefit"
        type="button"
        aria-label={`Corporate benefit, ${selectedOption?.programName ?? 'No corporate benefit selected'}`}
        aria-expanded={open}
        aria-controls="corporate-benefit-options"
        onClick={() => setOpen((current) => !current)}
        disabled={loading}
        className={`flex min-h-[60px] w-full items-center justify-between gap-3 rounded-xl bg-white px-5 py-2.5 text-left shadow-sm ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-wait disabled:opacity-70 ${open ? 'ring-2 ring-brand-600' : 'ring-slate-300 hover:ring-slate-400'}`}
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-medium text-slate-500">Selected benefit</span>
          <span className="block truncate text-sm font-bold text-slate-900">{selectedOption?.programName ?? 'No corporate benefit selected'}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-700 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id="corporate-benefit-options" role="listbox" aria-label="Corporate benefit choices" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(''); setOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${!value ? 'bg-sky-100' : 'hover:bg-slate-50'}`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${!value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'}`}><Check className="h-4 w-4" /></span>
            <span className="text-sm font-bold text-slate-900">No corporate benefit</span>
          </button>
          <div className="my-2 border-t border-slate-200" />
          {options.map((option) => {
            const selected = option.programId === value;
            return (
              <button
                key={option.programId}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(option.programId); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${selected ? 'bg-sky-100' : 'hover:bg-slate-50'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Check className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{option.programName}</span>
                  <span className="block text-xs text-slate-500">{option.isFull ? 'At capacity' : `${option.availableSlots} space${option.availableSlots === 1 ? '' : 's'} available`}</span>
                </span>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${option.isFull ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current align-middle" />{option.activeAllocations}/{option.capacity} used
                </span>
              </button>
            );
          })}
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
