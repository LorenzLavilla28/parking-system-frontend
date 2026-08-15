import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ScanLine, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { guardApi } from './api';

interface PhotoCaptureFieldProps {
  onPlateDetected: (plate: string) => void;
  disabled?: boolean;
}

export function PhotoCaptureField({ onPlateDetected, disabled = false }: PhotoCaptureFieldProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
    setMessage('Starting camera...');

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(null);
      setError('This device does not support camera scanning.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setMessage('Position the plate inside the guide, then scan.');
    } catch {
      setMessage(null);
      setError('Camera access is unavailable. Check the permission and try again.');
    }
  };

  const scanImage = async (image: Blob | File) => {
    if (isReading) return;

    setIsReading(true);
    setError(null);
    setMessage('Reading the plate...');

    try {
      const result = await guardApi.scanPlate(image);
      if (!result.detected || !result.plateNumber) {
        setMessage(null);
        setError('We could not read the plate number. Move closer, reduce glare, and try again.');
        return;
      }

      onPlateDetected(result.plateNumber);
      setMessage(`Detected ${result.plateNumber}. Please confirm or correct it above.`);
    } catch (scanError) {
      console.error('Plate scan failed', scanError);
      setMessage(null);
      setError('We could not read this plate. Try again or enter the number manually.');
    } finally {
      setIsReading(false);
    }
  };

  const captureAndRead = async () => {
    const video = videoRef.current;
    if (!video || isReading) return;

    try {
      await waitForVideoFrame(video);
      const frame = await canvasImageBlob(video, video.videoWidth, video.videoHeight);
      await scanImage(frame);
    } catch {
      setMessage(null);
      setError('The camera frame could not be read. Keep the plate steady and try again.');
    }
  };

  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Scan vehicle plate</p>
          <p className="text-sm text-slate-500">Use the camera to capture the plate number automatically.</p>
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
            <div className="pointer-events-none absolute inset-x-[8%] top-[28%] h-[44%] rounded-lg border-2 border-emerald-300/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.32)]" />
          </div>
          <p className="text-xs text-slate-500">Use even lighting, avoid glare, and hold the camera parallel to the plate.</p>
          <Button type="button" fullWidth onClick={captureAndRead} disabled={isReading}>
            {isReading ? <Spinner className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
            {isReading ? 'Reading plate...' : 'Scan plate'}
          </Button>
        </div>
      )}

      {message && <p className="mt-3 text-sm font-semibold text-emerald-700" aria-live="polite">{message}</p>}
      {error && <p className="mt-3 flex items-start gap-2 text-sm text-red-700" role="alert"><Square className="mt-1 h-3 w-3 shrink-0 fill-current" />{error}</p>}
    </div>
  );
}

function canvasImageBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('canvas_unavailable'));
  context.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('frame_encode_failed'));
    }, 'image/jpeg', 0.92);
  });
}

function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('video_not_ready')), 2500);
      const ready = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      video.addEventListener('loadeddata', ready, { once: true });
    });
  }

  if ('requestVideoFrameCallback' in video) {
    return new Promise((resolve) => {
      video.requestVideoFrameCallback(() => resolve());
    });
  }

  return new Promise((resolve) => window.setTimeout(resolve, 100));
}
