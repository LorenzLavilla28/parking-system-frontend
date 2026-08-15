import { useEffect, useState } from 'react';
import { AlertCircle, Bluetooth, BluetoothOff, CheckCircle2, Printer, RefreshCw } from 'lucide-react';
import { useGuardLocations } from './useGuardLocations';
import {
  disconnectThermalPrinter,
  getSavedThermalPrinter,
  isThermalPrinterConnected,
  isThermalPrintingAvailable,
  printTestReceipt,
  scanThermalPrinters,
  selectThermalPrinter,
  type ThermalPrinterDevice,
} from '@/lib/printing/thermalPrinter';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/states';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function GuardPrinterPage() {
  const { selectedId, selected, locations, isLoading } = useGuardLocations();
  const [savedPrinter, setSavedPrinter] = useState<ThermalPrinterDevice | null>(() => getSavedThermalPrinter());
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState<ThermalPrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'info'>('info');

  const refreshStatus = () => {
    setSavedPrinter(getSavedThermalPrinter(selectedId));
    void isThermalPrinterConnected(selectedId).then(setConnected);
  };

  useEffect(() => {
    setDevices([]);
    setMessage(null);
    refreshStatus();
    const handleFocus = () => refreshStatus();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedId]);

  const handleScan = async () => {
    setMessage(null);
    setIsScanning(true);
    try {
      setDevices(await scanThermalPrinters());
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'We could not find a printer. Make sure it is on and nearby, then try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelect = async (device: ThermalPrinterDevice) => {
    setMessage(null);
    setIsConnecting(true);
    setConnectingAddress(device.address);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      await selectThermalPrinter(device, selectedId);
      setSavedPrinter(getSavedThermalPrinter(selectedId));
      setConnected(true);
      setDevices([]);
      setMessageTone('success');
      setMessage('Printer connected and saved for this location.');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'We could not connect to this printer. Make sure it is on and nearby.');
    } finally {
      setIsConnecting(false);
      setConnectingAddress(null);
    }
  };

  const handleDisconnect = async () => {
    setMessage(null);
    setIsDisconnecting(true);
    try {
      await disconnectThermalPrinter(selectedId);
      setConnected(false);
      setMessageTone('success');
      setMessage('Printer disconnected. It remains saved and can be reconnected later.');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'We could not disconnect the printer.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTestPrint = async () => {
    if (!selected) return;
    setMessage(null);
    setIsTesting(true);
    try {
      await printTestReceipt(selected.name, selectedId);
      setConnected(true);
      setMessageTone('success');
      setMessage('Test receipt sent to the printer.');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'We could not send a test receipt.');
    } finally {
      setIsTesting(false);
    }
  };

  const busy = isScanning || isConnecting || isDisconnecting || isTesting;
  const available = isThermalPrintingAvailable();

  if (!isLoading && locations.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Gate operations" title="Printer setup" description="Connect the Bluetooth printer used for this parking location." />
        <EmptyState>You are not assigned to any parking location yet.</EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(isScanning || isConnecting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="status" aria-live="polite">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl ring-1 ring-slate-200">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-brand-700" />
            <p className="mt-4 text-lg font-bold text-slate-950">{isConnecting ? 'Connecting to printer' : 'Searching for printers'}</p>
            <p className="mt-1 text-sm text-slate-600">
              {isConnecting ? 'Keep the PT-210 switched on and nearby.' : 'Keep the printer switched on while we look for it.'}
            </p>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow="Gate operations"
        title="Printer setup"
        description="Connect the PT-210 once for this location. Entry tickets will print directly without opening a system print dialog."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)]">
        <Card className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Working location</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{selected?.name ?? 'Loading location...'}</h2>
              <p className="mt-1 text-sm text-slate-600">The saved printer is used only when printing tickets for this location.</p>
            </div>
            <StatusBadge
              tone={connected ? 'success' : savedPrinter ? 'attention' : 'neutral'}
              label={connected ? 'Connected' : savedPrinter ? 'Ready to connect' : 'Not configured'}
            />
          </div>

          {!available && (
            <Alert tone="warning">
              <span className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Bluetooth printing is not available in this browser. Use the installed Android or iOS app for direct printer access.</span>
              </span>
            </Alert>
          )}

          {available && savedPrinter && (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-slate-200">
                <Printer className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-950">{savedPrinter.name}</p>
                <p className="truncate text-xs text-slate-500">{savedPrinter.address}</p>
              </div>
              {connected && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleScan()} disabled={!available || busy} loading={isScanning}>
              <Bluetooth className="h-4 w-4" />
              {savedPrinter ? 'Change printer' : 'Connect printer'}
            </Button>
            {connected && (
              <Button type="button" variant="secondary" onClick={() => void handleDisconnect()} disabled={busy} loading={isDisconnecting}>
                <BluetoothOff className="h-4 w-4" />
                Disconnect
              </Button>
            )}
            {savedPrinter && (
              <Button type="button" variant="secondary" onClick={() => void handleTestPrint()} disabled={!available || busy} loading={isTesting}>
                <Printer className="h-4 w-4" />
                Test print
              </Button>
            )}
          </div>

          {devices.length > 0 && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200" aria-busy={isConnecting}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Available printers</p>
              {devices.map((device) => (
                <button
                  key={device.address}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md bg-white px-3 py-3 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-70"
                  onClick={() => void handleSelect(device)}
                  disabled={busy}
                  aria-busy={connectingAddress === device.address}
                >
                  <span>
                    <span className="block">{device.name}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-500">{device.address}</span>
                  </span>
                  {connectingAddress === device.address && <RefreshCw className="h-4 w-4 animate-spin text-brand-700" />}
                </button>
              ))}
            </div>
          )}

          {message && <Alert tone={messageTone === 'success' ? 'success' : messageTone === 'error' ? 'error' : 'info'}>{message}</Alert>}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-base font-bold text-slate-950">How this works</h2>
          <ol className="space-y-3 text-sm leading-6 text-slate-600">
            <li><span className="font-bold text-slate-950">1.</span> Turn on the PT-210 and keep it nearby.</li>
            <li><span className="font-bold text-slate-950">2.</span> Select Connect printer and choose the PT-210.</li>
            <li><span className="font-bold text-slate-950">3.</span> Use Test print to confirm the paper layout.</li>
            <li><span className="font-bold text-slate-950">4.</span> Return to Vehicle entry. The Print button will send tickets to this printer.</li>
          </ol>
          <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
            The printer selection is saved on this device for the selected location. Disconnecting stops the current Bluetooth connection without deleting the saved printer.
          </p>
        </Card>
      </div>
    </div>
  );
}
