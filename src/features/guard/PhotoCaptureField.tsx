import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, CameraOff, ScanLine, Square, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { normalizePlateInput } from './plate';

interface PhotoCaptureFieldProps {
  onPlateDetected: (plate: string) => void;
  disabled?: boolean;
}

/**
 * Captures a camera frame and runs OCR entirely in the browser. The canvas is
 * only held in memory and is never included in the record-entry request.
 */
export function PhotoCaptureField({ onPlateDetected, disabled = false }: PhotoCaptureFieldProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => undefined);
  }, [cameraOpen]);

  const startCamera = async () => {
    setError(null);
    setMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setError('Camera access was denied or is unavailable on this device.');
    }
  };

  const captureAndRead = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || isReading) return;

    await readPlate(video, video.videoWidth, video.videoHeight);
  };

  const uploadAndRead = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isReading) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file containing a plate number.');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(imageUrl);
      // Uploaded photos usually frame the plate tightly, so keep nearly all
      // of the image. The camera overlay still uses the narrower crop below.
      await readPlate(image, image.naturalWidth, image.naturalHeight, 0.03);
    } catch {
      setMessage(null);
      setError('The selected image could not be loaded. Please choose another image.');
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const readPlate = async (
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    cropMargin = 0.15,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || isReading) return;

    setIsReading(true);
    setError(null);
    setMessage('Reading plate locally...');
    const cropX = Math.floor(sourceWidth * cropMargin);
    const cropY = Math.floor(sourceHeight * cropMargin);
    const cropWidth = Math.floor(sourceWidth * (1 - cropMargin * 2));
    const cropHeight = Math.floor(sourceHeight * (1 - cropMargin * 2));
    const scale = 2;
    canvas.width = cropWidth * scale;
    canvas.height = cropHeight * scale;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context?.drawImage(
      source,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    let worker: Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>> | null = null;
    try {
      const { createWorker, PSM } = await import('tesseract.js');
      worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        // A camera capture is already framed around the plate; an uploaded
        // photo may contain the whole vehicle and needs general page layout
        // detection first.
        tessedit_pageseg_mode: cropMargin > 0.1 ? PSM.SINGLE_LINE : PSM.AUTO,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });
      const result = await worker.recognize(canvas);
      const plate = extractPlateCandidate(result.data.text);

      if (!plate) {
        setMessage(null);
        setError('No clear plate number was found. Move closer, improve the lighting, and try again.');
        return;
      }

      onPlateDetected(plate);
      setMessage(`Detected ${plate}. Please confirm or correct it above.`);
    } catch {
      setMessage(null);
      setError('The local OCR reader could not process this image. You can enter the plate manually.');
    } finally {
      await worker?.terminate();
      setIsReading(false);
    }
  };

  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Scan plate locally</p>
          <p className="text-sm text-slate-500">The image stays on this device and is not uploaded.</p>
        </div>
        {!cameraOpen ? (
          <Button type="button" variant="secondary" size="sm" onClick={startCamera} disabled={disabled}>
            <Camera className="h-4 w-4" />
            Open camera
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={stopCamera} disabled={isReading}>
            <CameraOff className="h-4 w-4" />
            Close camera
          </Button>
        )}
      </div>

      {cameraOpen && (
        <div className="mt-4 space-y-3">
          <div className="relative overflow-hidden rounded-lg bg-slate-950">
            <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted aria-label="Plate camera preview" />
            <div className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.25)]" />
          </div>
          <Button type="button" fullWidth onClick={captureAndRead} disabled={isReading}>
            {isReading ? <Spinner className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
            {isReading ? 'Reading plate...' : 'Capture and read plate'}
          </Button>
        </div>
      )}

      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
        <Upload className="h-4 w-4" />
        Upload plate image
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={uploadAndRead}
          disabled={disabled || isReading}
        />
      </label>

      {message && <p className="mt-3 text-sm font-semibold text-emerald-700" aria-live="polite">{message}</p>}
      {error && <p className="mt-3 flex items-start gap-2 text-sm text-red-700" role="alert"><Square className="mt-1 h-3 w-3 shrink-0 fill-current" />{error}</p>}
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image_load_failed'));
    image.src = url;
  });
}

function extractPlateCandidate(rawText: string): string | null {
  const tokens = rawText.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  const candidates = [...tokens];

  for (let i = 0; i < tokens.length - 1; i++) {
    candidates.push(`${tokens[i]}${tokens[i + 1]}`);
  }

  const best = candidates
    .map((candidate) => candidate.replace(/[^A-Z0-9]/g, ''))
    .filter((candidate) => candidate.length >= 4 && candidate.length <= 10)
    .filter((candidate) => /[A-Z]/.test(candidate) && /[0-9]/.test(candidate))
    .sort((a, b) => b.length - a.length)[0];

  return best ? normalizePlateInput(best) : null;
}
