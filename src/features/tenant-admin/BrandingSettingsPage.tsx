import { useEffect, useState } from 'react';
import { Image, Trash2, Upload } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './api';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/states';

const fallbackMaxBytes = 2 * 1024 * 1024;

export function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const branding = useQuery({ queryKey: ['tenant-branding'], queryFn: adminApi.getBranding });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const maxBytes = branding.data?.maxLogoBytes ?? fallbackMaxBytes;
  const upload = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('Choose a logo file first.');
      return adminApi.uploadLogo(selectedFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-logo'] });
      setSelectedFile(null);
    },
  });

  const remove = useMutation({
    mutationFn: adminApi.deleteLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-logo'] });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    },
  });

  const chooseFile = (file: File | undefined) => {
    setFileError(null);
    upload.reset();
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setSelectedFile(null);
      setFileError('Choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > maxBytes) {
      setSelectedFile(null);
      setFileError(`The logo must be no larger than ${formatBytes(maxBytes)}.`);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Branding"
        description="Upload an optional logo for your tenant's public parking pages."
      />

      {branding.isError && <ErrorState error={branding.error} />}
      {fileError && <Alert tone="error">{fileError}</Alert>}
      {upload.isError && <ErrorState error={upload.error} />}
      {remove.isError && <ErrorState error={remove.error} />}

      <Card className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Image className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Tenant logo</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              PNG, JPEG, and WebP files up to {formatBytes(maxBytes)} are supported. The file is stored in the private tenant-assets bucket and served through the API.
            </p>
          </div>
        </div>

        {(previewUrl || branding.data?.logoUrl) && (
          <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected tenant logo" className="max-h-28 max-w-xs object-contain" />
            ) : (
              <p className="text-sm font-semibold text-emerald-800">A tenant logo is configured.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> Choose logo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
          <Button type="button" onClick={() => upload.mutate()} disabled={!selectedFile} loading={upload.isPending}>
            Upload logo
          </Button>
          {branding.data?.logoUrl && (
            <Button type="button" variant="secondary" onClick={() => remove.mutate()} loading={remove.isPending}>
              <Trash2 className="h-4 w-4" /> Remove logo
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`;
}
