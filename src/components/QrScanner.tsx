"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanLine } from "lucide-react";
import { decodeImageData } from "@/lib/qr";

/**
 * Full-screen live QR scanner. Streams the rear camera and calls onResult
 * with the first decoded payload, then closes.
 */
export function QrScanner({
  onResult,
  onClose,
}: {
  onResult: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        canvasRef.current = document.createElement("canvas");
        tick();
      } catch {
        setError(
          "Couldn't access the camera. Check permissions, or paste the link manually.",
        );
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const found = decodeImageData(ctx.getImageData(0, 0, w, h));
      if (found) {
        onResult(found);
        return; // stop scanning
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ScanLine size={18} aria-hidden />
          Scan the receipt QR
        </span>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
        >
          <X size={20} aria-hidden />
        </button>
      </div>

      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}
        {error && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-white p-4 text-center text-sm text-foreground">
            {error}
          </div>
        )}
      </div>

      <p className="px-6 py-4 text-center text-xs text-white/70">
        Point the camera at the QR code printed on your receipt.
      </p>
    </div>
  );
}
