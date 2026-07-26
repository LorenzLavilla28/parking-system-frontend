import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, KeyRound, Link2, LockKeyhole, RefreshCw, Unplug } from 'lucide-react';
import { adminApi } from './api';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/states';

const environments = ['test', 'live'] as const;

export function PaymentSettingsPage() {
  const queryClient = useQueryClient();
  const connections = useQuery({
    queryKey: ['paymongo-connections'],
    queryFn: adminApi.getPayMongoConnections,
  });
  const [environment, setEnvironment] = useState<(typeof environments)[number]>('test');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [accountId, setAccountId] = useState('');
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => connections.data?.find((connection) => connection.environment === environment),
    [connections.data, environment],
  );

  const connect = useMutation({
    mutationFn: () =>
      adminApi.connectPayMongo({
        environment,
        secretKey,
        webhookSecret,
        payMongoAccountId: accountId.trim() || undefined,
      }),
    onSuccess: () => {
      setSecretKey('');
      setWebhookSecret('');
      setAccountId('');
      queryClient.invalidateQueries({ queryKey: ['paymongo-connections'] });
    },
  });

  const disconnect = useMutation({
    mutationFn: () => adminApi.disconnectPayMongo(environment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymongo-connections'] }),
  });

  const copyWebhookUrl = async () => {
    if (!selected?.webhookUrl) return;
    await navigator.clipboard.writeText(selected.webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Payment settings"
        description="Connect your own PayMongo account so parking payments settle directly to your business."
      />

      <Alert tone="info">
        Your PayMongo secret key is sent only to the backend and stored in AWS Secrets Manager. It is never saved in
        the application database or returned to the browser.
      </Alert>

      {connections.isError && <ErrorState error={connections.error} />}

      <Card className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-slate-950">
              <KeyRound className="h-5 w-5 text-brand-700" />
              Connect PayMongo
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Use credentials from your own PayMongo dashboard. Test mode is recommended while setting up your first
              connection.
            </p>
          </div>
          {selected?.status === 'Connected' && (
            <Badge tone="green">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Connected
            </Badge>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {environments.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEnvironment(mode)}
              className={`rounded-xl p-4 text-left ring-1 transition ${
                environment === mode
                  ? 'bg-brand-50 text-brand-900 ring-brand-300'
                  : 'bg-white text-slate-700 ring-slate-200 hover:ring-slate-300'
              }`}
            >
              <p className="font-bold">{mode === 'test' ? 'Test mode' : 'Live mode'}</p>
              <p className="mt-1 text-sm opacity-75">
                {mode === 'test' ? 'Safe for setup and payment testing.' : 'Real customer payments and settlement.'}
              </p>
            </button>
          ))}
        </div>

        {selected?.status === 'Connected' && (
          <div className="space-y-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-bold text-emerald-950">{environment === 'test' ? 'Test' : 'Live'} payments connected</p>
                <p className="mt-1 text-sm text-emerald-800">
                  {selected.payMongoAccountId ? `PayMongo account: ${selected.payMongoAccountId}` : 'PayMongo credentials are active.'}
                </p>
              </div>
            </div>
            {selected.webhookUrl && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-emerald-950">Webhook URL</p>
                <div className="flex gap-2">
                  <Input readOnly value={selected.webhookUrl} className="bg-white text-xs" />
                  <Button type="button" variant="secondary" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs text-emerald-800">Add this URL to the matching environment in PayMongo Developers → Webhooks.</p>
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => disconnect.mutate()}
              loading={disconnect.isPending}
            >
              <Unplug className="h-4 w-4" /> Disconnect {environment === 'test' ? 'test' : 'live'} payments
            </Button>
          </div>
        )}

        {selected?.status === 'Invalid' && <Alert tone="error">{selected.lastError ?? 'PayMongo credentials are invalid.'}</Alert>}

        <form
          className="space-y-4 border-t border-slate-200 pt-6"
          onSubmit={(event) => {
            event.preventDefault();
            connect.mutate();
          }}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {selected?.status === 'Connected' ? <RefreshCw className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {selected?.status === 'Connected' ? 'Rotate credentials' : 'Enter credentials'}
          </div>
          <FormField label="PayMongo secret key" htmlFor="paymongo-secret-key">
            <Input
              id="paymongo-secret-key"
              type="password"
              autoComplete="new-password"
              placeholder={environment === 'test' ? 'sk_test_...' : 'sk_live_...'}
              value={secretKey}
              onChange={(event) => setSecretKey(event.target.value)}
              required
            />
          </FormField>
          <FormField label="PayMongo webhook secret" htmlFor="paymongo-webhook-secret">
            <Input
              id="paymongo-webhook-secret"
              type="password"
              autoComplete="new-password"
              placeholder="Enter the webhook signing secret"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              required
            />
          </FormField>
          <FormField label="PayMongo account ID (optional)" htmlFor="paymongo-account-id">
            <Input
              id="paymongo-account-id"
              placeholder="Optional account identifier"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            />
          </FormField>

          {connect.isError && <ErrorState error={connect.error} />}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-slate-500">Only server-side secret keys are accepted. Never use a public key here.</p>
            <Button type="submit" loading={connect.isPending}>
              {selected?.status === 'Connected' ? 'Save new credentials' : 'Connect PayMongo'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
