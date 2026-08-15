import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Printer, QrCode, TicketCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import type { EntryTicket as Ticket } from './api';
import {
  ThermalPrinterNotConfiguredError,
  printEntryTicket,
} from '@/lib/printing/thermalPrinter';

export function EntryTicket({
  ticket,
  locationId,
  onDone,
}: {
  ticket: Ticket;
  locationId: string | null;
  onDone: () => void;
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerMessage, setPrinterMessage] = useState<string | null>(null);
  const [needsPrinterSetup, setNeedsPrinterSetup] = useState(false);

  const handlePrint = async () => {
    setPrinterMessage(null);
    setNeedsPrinterSetup(false);
    setIsPrinting(true);
    try {
      await printEntryTicket(ticket, locationId);
      setPrinterMessage('Ticket sent to the printer.');
    } catch (error) {
      setNeedsPrinterSetup(error instanceof ThermalPrinterNotConfiguredError);
      setPrinterMessage(error instanceof Error ? error.message : 'We could not print the ticket. Check the printer and try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <TicketCheck className="h-7 w-7" />
      </div>
      <div>
        <p className="text-3xl font-bold tracking-wider text-slate-900">{ticket.plateNumber}</p>
        <p className="text-sm text-slate-500">{ticket.locationName}</p>
        <p className="text-sm text-slate-500">Entry: {formatDateTime(ticket.entryTime)}</p>
      </div>

      <img
        src={ticket.qrCodeDataUri}
        alt="Parking session QR code"
        className="mx-auto h-48 w-48 rounded-lg ring-1 ring-slate-200"
      />

      <div className="rounded-lg bg-slate-50 py-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Ticket code</p>
        <p className="text-2xl font-bold tracking-widest text-slate-900">{ticket.ticketCode}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" size="lg" onClick={() => void handlePrint()} loading={isPrinting}>
          <Printer className="h-4 w-4" />
          {isPrinting ? 'Printing...' : 'Print'}
        </Button>
        <a href={ticket.paymentUrl} target="_blank" rel="noreferrer" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
          <QrCode className="h-4 w-4" />
          Display QR
        </a>
        <Link to={`/guard/exit?session=${ticket.sessionId}`} className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
          <ExternalLink className="h-4 w-4" />
          View session
        </Link>
        <Button size="lg" onClick={onDone}>
          New entry
        </Button>
      </div>

      {printerMessage && (
        <div className="space-y-1 text-left" aria-live="polite">
          <p className="text-xs font-semibold text-slate-600">{printerMessage}</p>
          {needsPrinterSetup && (
            <Link to="/guard/printer" className="text-xs font-semibold text-brand-700 hover:underline">
              Open printer setup
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
