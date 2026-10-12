'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface WarehouseScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
  placeholder?: string;
  initialQuery?: string;
}

export default function WarehouseScanner({
  onScan,
  disabled = false,
  placeholder = 'Scan barcode / QR or enter Part #, Bin...',
  initialQuery = '',
}: WarehouseScannerProps) {
  const [manualInput, setManualInput] = useState(initialQuery);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'warehouse-qr-camera-stream';

  // Sound feedback for scans
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz beep
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(80);
      } catch {
        // vibration not supported
      }
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const cleaned = decodedText.trim();
    if (!cleaned) return;

    playBeep();
    setLastScannedCode(cleaned);
    setManualInput(cleaned);
    onScan(cleaned);

    // Briefly pause camera or keep active
  }, [onScan, playBeep]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(readerElementId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame missed, ignore
        }
      );

      isScanningRef.current = true;
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera start failed:', err);
      setCameraError(
        err?.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Unable to start camera. Please enter barcode/number manually below.'
      );
      setIsCameraActive(false);
      isScanningRef.current = false;
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      } finally {
        isScanningRef.current = false;
        setIsCameraActive(false);
      }
    }
  };

  // Toggle Camera
  const handleToggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          isScanningRef.current = false;
        });
      }
    };
  }, []);

  // Handle manual submit (or hardware barcode scanner Enter key)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = manualInput.trim();
    if (cleaned) {
      playBeep();
      setLastScannedCode(cleaned);
      onScan(cleaned);
    }
  };

  const handleClear = () => {
    setManualInput('');
    setLastScannedCode(null);
    inputRef.current?.focus();
  };

  return (
    <div style={styles.container}>
      {/* Search & Scan Action Bar */}
      <form onSubmit={handleManualSubmit} style={styles.inputRow}>
        <div style={styles.inputWrapper}>
          <span style={styles.scanIcon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            style={styles.textInput}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
          />
          {manualInput && (
            <button
              type="button"
              onClick={handleClear}
              style={styles.clearBtn}
              aria-label="Clear input"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || !manualInput.trim()}
          style={{
            ...styles.lookupBtn,
            ...(!manualInput.trim() ? styles.lookupBtnDisabled : {}),
          }}
        >
          Lookup
        </button>

        <button
          type="button"
          onClick={handleToggleCamera}
          style={{
            ...styles.cameraBtn,
            ...(isCameraActive ? styles.cameraBtnActive : {}),
          }}
          aria-label={isCameraActive ? 'Turn off camera' : 'Open barcode camera scanner'}
        >
          {isCameraActive ? '⏹ Close Camera' : '📷 Scan Barcode'}
        </button>
      </form>

      {/* Camera Stream Overlay */}
      {isCameraActive && (
        <div style={styles.cameraBox}>
          <div style={styles.cameraHeader}>
            <span style={styles.cameraIndicator}>● Live Camera Scanner</span>
            <button
              type="button"
              onClick={stopCamera}
              style={styles.closeCameraTopBtn}
            >
              ✕ Close
            </button>
          </div>
          <div id={readerElementId} style={styles.readerElement} />
          <div style={styles.cameraHint}>
            Point camera at any 1D Barcode or 2D QR Code on parts, shelves, or bins
          </div>
        </div>
      )}

      {/* Camera Error Alert */}
      {cameraError && (
        <div style={styles.errorBanner}>
          ⚠️ {cameraError}
        </div>
      )}

      {/* Last Scanned Feedback Pill */}
      {lastScannedCode && (
        <div style={styles.feedbackRow}>
          <span style={styles.feedbackLabel}>Active Scan / Query:</span>
          <code style={styles.feedbackCode}>{lastScannedCode}</code>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: '1 1 240px',
    minWidth: '220px',
  },
  scanIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '1rem',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  textInput: {
    width: '100%',
    padding: '12px 36px 12px 40px',
    borderRadius: '10px',
    border: '1.5px solid #cbd5e1',
    fontSize: '0.9375rem',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    transition: 'border-color 0.15s ease',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '4px',
  },
  lookupBtn: {
    padding: '12px 20px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    minHeight: '44px',
  },
  lookupBtnDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  cameraBtn: {
    padding: '12px 18px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '44px',
  },
  cameraBtnActive: {
    backgroundColor: '#dc2626',
  },
  cameraBox: {
    marginTop: '16px',
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '12px',
    overflow: 'hidden',
  },
  cameraHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cameraIndicator: {
    color: '#ef4444',
    fontSize: '0.8125rem',
    fontWeight: 600,
  },
  closeCameraTopBtn: {
    background: 'none',
    border: 'none',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '0.8125rem',
  },
  readerElement: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  cameraHint: {
    color: '#94a3b8',
    fontSize: '0.75rem',
    textAlign: 'center',
    marginTop: '8px',
  },
  errorBanner: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#b91c1c',
    fontSize: '0.8125rem',
  },
  feedbackRow: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  feedbackLabel: {
    fontWeight: 500,
  },
  feedbackCode: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 700,
  },
};
