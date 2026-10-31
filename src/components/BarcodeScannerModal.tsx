import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, Barcode as BarcodeIcon, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { soundManager } from '../utils/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
}) => {
  const { products } = useApp();
  const [manualCode, setManualCode] = useState('');
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Handle Camera initialization if supported
  useEffect(() => {
    let active = true;

    async function startCamera() {
      if (!isOpen) return;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          if (active && videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setHasCamera(true);
            setCameraError(null);
          }
        }
      } catch (err: unknown) {
        if (active) {
          setHasCamera(false);
          setCameraError('Camera access not permitted or unavailable. Use manual/quick scan.');
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    soundManager.playScanBeep();
    setScannedSuccess(clean);
    onBarcodeDetected(clean);
    setManualCode('');

    setTimeout(() => {
      setScannedSuccess(null);
      onClose();
    }, 400);
  };

  const handleQuickSampleScan = (barcode: string) => {
    soundManager.playScanBeep();
    setScannedSuccess(barcode);
    onBarcodeDetected(barcode);
    setTimeout(() => {
      setScannedSuccess(null);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-lg w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BarcodeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                Barcode Scanner
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Scan with camera, hardware barcode gun, or click sample
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Viewport or Placeholder */}
          <div className="relative rounded-lg overflow-hidden bg-neutral-950 aspect-video flex items-center justify-center border border-neutral-800">
            {hasCamera ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 text-neutral-400">
                <Camera className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs max-w-xs">
                  {cameraError || 'Camera preview standing by. Enter code or select sample.'}
                </p>
              </div>
            )}

            {/* Red Scanning Laser Line animation */}
            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse pointer-events-none" />

            {/* Success Feedback Overlay */}
            {scannedSuccess && (
              <div className="absolute inset-0 bg-emerald-600/80 backdrop-blur-xs flex items-center justify-center text-white gap-2 font-medium text-sm animate-in fade-in">
                <Check className="w-6 h-6" /> Scanned {scannedSuccess}
              </div>
            )}
          </div>

          {/* Manual Input / Hardware Scanner Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Hardware Scanner / Manual Barcode
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Scan or type barcode (e.g. 8901030383728)"
                className="flex-1 px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Scan Code
              </button>
            </div>
          </form>

          {/* Quick Click Sample Barcodes for rapid testing */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Test: Tap any store item barcode to test scan</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {products.slice(0, 6).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickSampleScan(p.barcode)}
                  className="flex flex-col items-start p-2 text-left rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-neutral-200 dark:border-neutral-700/60 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
                >
                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate w-full">
                    {p.name}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    {p.barcode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
