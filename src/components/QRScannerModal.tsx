import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import jsQR from 'jsqr';
import { AlertCircle, Camera, ImageUp, Loader2, ScanLine, ShieldCheck, X } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image illisible'));
    image.src = source;
  });
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const hasResultRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);

  const [isStarting, setIsStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isReadingImage, setIsReadingImage] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stopCamera = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDetected = useCallback(
    (value: string) => {
      if (hasResultRef.current) return;
      hasResultRef.current = true;
      stopCamera();
      onDetectedRef.current(value);
      onCloseRef.current();
    },
    [stopCamera],
  );

  useEffect(() => {
    if (!isOpen) return;

    hasResultRef.current = false;
    setIsStarting(true);
    setCameraError(null);
    setUploadError(null);
    setIsReadingImage(false);

    let disposed = false;
    let timer: number | undefined;

    const readFrame = () => {
      if (disposed) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code?.data) {
            handleDetected(code.data);
            return;
          }
        }
      }

      timer = window.setTimeout(readFrame, 260);
      timerRef.current = timer;
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setIsStarting(false);
        setCameraError(
          "Votre navigateur ne permet pas d'ouvrir la caméra. Importez une photo du QR code ou collez le lien de la boutique.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // Certains navigateurs demandent une interaction avant la lecture.
          }
        }

        setIsStarting(false);
        timer = window.setTimeout(readFrame, 260);
        timerRef.current = timer;
      } catch (error) {
        if (disposed) return;
        setIsStarting(false);
        const errorName = error instanceof DOMException ? error.name : '';
        setCameraError(
          errorName === 'NotAllowedError'
            ? "L'accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur, ou importez une photo du QR code."
            : "Impossible d'ouvrir la caméra. Vérifiez qu'aucune autre application ne l'utilise, ou importez une photo du QR code.",
        );
      }
    };

    void startCamera();

    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      stopCamera();
    };
  }, [handleDetected, isOpen, stopCamera]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadError(null);
    setIsReadingImage(true);
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await loadImage(objectUrl);
      const maxSize = 1400;
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas indisponible');

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (!code?.data) {
        setUploadError("Aucun QR code lisible sur cette image. Essayez une photo plus nette et bien cadrée.");
        return;
      }

      handleDetected(code.data);
    } catch {
      setUploadError("Impossible de lire cette image. Essayez un autre fichier.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsReadingImage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink-950/80 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-scanner-title"
          className="relative z-10 my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-ink-950 text-white shadow-elevated"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">
                Accès rapide
              </p>
              <h2 id="qr-scanner-title" className="font-display text-lg font-bold tracking-tight">
                Scanner un QR code
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Fermer le scanner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-full w-full object-cover ${cameraError ? 'opacity-0' : 'opacity-100'}`}
              />

              {!cameraError && (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(0,0,0,0.35)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="relative h-40 w-40 sm:h-48 sm:w-48">
                      <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-brand-400" />
                      <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-brand-400" />
                      <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-brand-400" />
                      <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-brand-400" />
                      <span className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-brand-400/80 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
                    </div>
                  </div>
                </>
              )}

              {isStarting && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink-950/60">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
                  <span className="text-xs text-white/70">Ouverture de la caméra...</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-xs leading-relaxed text-white/65">{cameraError}</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
              <p className="text-[11px] leading-relaxed text-white/55">
                Placez le QR code de la boutique dans le cadre. Le scan se fait uniquement dans votre navigateur.
              </p>
            </div>

            {uploadError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingImage}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isReadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageUp className="h-4 w-4" />
              )}
              {isReadingImage ? 'Lecture de la photo...' : 'Importer une photo du QR code'}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/35">
              <ShieldCheck className="h-3.5 w-3.5" />
              Aucune photo n'est envoyée sur un serveur
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
