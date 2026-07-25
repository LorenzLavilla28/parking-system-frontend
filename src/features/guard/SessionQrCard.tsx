import { useQuery } from '@tanstack/react-query';
import { QrCode, X } from 'lucide-react';
import { guardApi } from './api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/states';

export function SessionQrCard({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const qr = useQuery({
    queryKey: ['session-qr', sessionId],
    queryFn: () => guardApi.getQr(sessionId),
  });

  return (
    <Card className="flex flex-col items-center gap-3 text-center">
      <div className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-950"><QrCode className="h-4 w-4 text-brand-700" /> Payment QR code</p>
          <p className="mt-1 text-xs text-slate-500">The customer can scan this code to review and settle the current balance.</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} aria-label="Hide payment QR"><X className="h-4 w-4" /></Button>
      </div>
      {qr.isLoading && <LoadingState label="Loading payment QR..." />}
      {qr.isError && <ErrorState error={qr.error} />}
      {qr.data && <><img src={qr.data.qrCodeDataUri} alt="Payment QR code" className="h-56 w-56 rounded-lg bg-white p-2 ring-1 ring-slate-200" /><a href={qr.data.paymentUrl} target="_blank" rel="noreferrer" className="max-w-full break-all text-xs font-semibold text-brand-700 hover:underline">{qr.data.paymentUrl}</a></>}
    </Card>
  );
}
