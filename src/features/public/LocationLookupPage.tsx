import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CarFront, Search, ShieldCheck } from 'lucide-react';
import { publicApi } from './api';
import { apiUrl } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { ApiError } from '@/lib/api/types';

export function LocationLookupPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);

  const location = useQuery({
    queryKey: ['public-location', slug],
    queryFn: () => publicApi.getLocation(slug),
  });

  const lookup = useMutation({
    mutationFn: () =>
      publicApi.lookupPlate(slug, {
        plateNumber: plate,
        captchaToken: captchaChecked ? 'verified' : null,
      }),
    onSuccess: (result) => {
      if (result.outcome === 'found' && result.publicToken) {
        navigate(`/p/${result.publicToken}`);
        return;
      }
      if (result.captchaRequired) setNeedsCaptcha(true);
    },
  });

  if (location.isLoading) return <LoadingState />;
  if (location.isError) return <ErrorState error={location.error} />;

  const result = lookup.data;
  const error = lookup.error instanceof ApiError ? lookup.error : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/70 p-5 shadow-sm ring-1 ring-white/80 backdrop-blur">
        {location.data?.logoUrl && <img src={apiUrl(location.data.logoUrl)} alt="Parking operator logo" className="mb-4 max-h-16 max-w-48 object-contain object-left" />}
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Parking lookup</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{location.data?.name}</h1>
        {location.data?.address && <p className="mt-1 text-sm text-slate-500">{location.data.address}</p>}
      </div>

      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <CarFront className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Find your parking</h2>
            <p className="text-sm text-slate-600">Enter your plate number to open your payment session.</p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            lookup.reset();
            lookup.mutate();
          }}
        >
          <FormField label="Plate number" htmlFor="plate">
            <Input
              id="plate"
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              placeholder="ABC 1234"
              autoCapitalize="characters"
              autoComplete="off"
              required
            />
          </FormField>

          {needsCaptcha && (
            <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={captchaChecked}
                onChange={(event) => setCaptchaChecked(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              />
              I'm not a robot
            </label>
          )}

          {error?.code === 'rate_limited' && (
            <Alert tone="warning">Too many attempts. Please wait a few minutes and try again.</Alert>
          )}

          {result?.outcome === 'not_found' && (
            <Alert tone="error">No active session was found for that plate at this location.</Alert>
          )}
          {result?.outcome === 'multiple' && (
            <Alert tone="warning">
              Multiple sessions match that plate. Please use your ticket code or ask a guard for help.
            </Alert>
          )}
          {result?.outcome === 'captcha_required' && (
            <Alert tone="info">Please confirm you're not a robot, then search again.</Alert>
          )}

          <Button type="submit" fullWidth size="lg" loading={lookup.isPending} disabled={!plate.trim()}>
            <Search className="h-5 w-5" />
            Find my parking
          </Button>
        </form>

        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
          <ShieldCheck className="h-4 w-4" />
          Your payment amount is calculated securely by the parking operator.
        </div>
      </Card>
    </div>
  );
}
