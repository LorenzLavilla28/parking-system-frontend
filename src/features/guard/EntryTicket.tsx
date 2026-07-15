import { Link } from 'react-router-dom';
import { ExternalLink, Printer, QrCode, TicketCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/format';
import type { EntryTicket as Ticket } from './api';

export function EntryTicket({ ticket, onDone }: { ticket: Ticket; onDone: () => void }) {
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

      <div className="grid gap-2 print:hidden sm:grid-cols-2">
        <Button variant="secondary" size="lg" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
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
    </Card>
  );
}
