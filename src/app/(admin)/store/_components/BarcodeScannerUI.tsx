"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Flashlight, FlashlightOff } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerUIProps {
  onClose: () => void;
  onDetected: (code: string) => void;
}

export function BarcodeScannerUI({ onClose, onDetected }: BarcodeScannerUIProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let scanInterval: NodeJS.Timeout;
    let isProcessing = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        const capabilities = track.getCapabilities
          ? (track.getCapabilities() as any)
          : {};
        if (capabilities.torch) setHasTorch(true);

        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true);
          }
        });

        // Path A: Native BarcodeDetector (Android Chrome)
        if ("BarcodeDetector" in window) {
          // @ts-ignore
          const detector = new window.BarcodeDetector({
            formats: ["ean_13", "code_128", "upc_a", "ean_8"],
          });

          scanInterval = setInterval(async () => {
            if (isProcessing || !videoRef.current) return;
            isProcessing = true;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                clearInterval(scanInterval);
                onDetected(barcodes[0].rawValue);
              }
            } catch {}
            finally { isProcessing = false; }
          }, 100);
        }
        // Path B: WASM fallback (iOS Safari, desktop)
        else {
          const { readBarcodesFromImageData } = await import("zxing-wasm/reader");

          scanInterval = setInterval(async () => {
            if (isProcessing || !videoRef.current || videoRef.current.readyState !== 4) return;
            isProcessing = true;

            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              try {
                const results = await readBarcodesFromImageData(imageData, {
                  formats: ["EAN13", "Code128", "EAN8", "UPCA"],
                  tryHarder: false,
                });
                if (results?.length > 0) {
                  clearInterval(scanInterval);
                  onDetected(results[0].text);
                }
              } catch {}
            }
            isProcessing = false;
          }, 150);
        }
      } catch {
        toast.error("Camera access denied or unavailable.");
        onClose();
      }
    };

    startCamera();

    return () => {
      clearInterval(scanInterval);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose, onDetected]);

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    try {
      const next = !isTorchOn;
      await trackRef.current.applyConstraints({
        advanced: [{ torch: next } as any],
      });
      setIsTorchOn(next);
    } catch {
      toast.error("Could not toggle flashlight.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 bg-black flex flex-col"
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-linear-to-b from-black/80 to-transparent">
        <h3 className="text-white font-bold tracking-wide">Scan Product Barcode</h3>
        <div className="flex items-center gap-3">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                isTorchOn
                  ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                  : "bg-white/20 text-white"
              }`}
            >
              {isTorchOn ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-white/20 rounded-full text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative w-64 h-40 border-2 border-[#2D6A4F] rounded-xl overflow-hidden shadow-[0_0_0_4000px_rgba(0,0,0,0.6)]">
          <motion.div
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-[#2D6A4F] shadow-[0_0_10px_#2D6A4F]"
          />
        </div>
      </div>

      <div className="p-6 pb-10 bg-black text-center text-gray-400 text-sm">
        Align the barcode within the frame. Auto-detecting...
      </div>
    </motion.div>
  );
}