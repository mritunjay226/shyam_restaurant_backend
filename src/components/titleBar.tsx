"use client";

// components/TitleBar.tsx

import { useEffect, useState } from "react";
import { Minus, Square, X, RotateCcw, Maximize2 } from "lucide-react";

declare global {
  interface Window {
    electronAPI?: {
      minimize:    () => void;
      maximize:    () => void;
      close:       () => void;
      reload:      () => void;
      isMaximized: () => Promise<boolean>;
      onMaximized: (cb: (val: boolean) => void) => void;
    };
  }
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsElectron(true);
      window.electronAPI.isMaximized().then(setIsMaximized);
      window.electronAPI.onMaximized(setIsMaximized);
    }
  }, []);

  if (!isElectron) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 flex items-center justify-between"
      style={{
        height: "36px",
        zIndex: 99999,
        WebkitAppRegion: "drag",
      } as React.CSSProperties}
    >
      {/* Left — app label */}
      <span className="px-4 text-xs font-semibold text-gray-400 tracking-wide select-none">
        Shyam Hotel
      </span>

      {/* Right — window controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI?.reload()}
          title="Reload"
          className="h-full w-10 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={12} />
        </button>
        <button
          onClick={() => window.electronAPI?.minimize()}
          title="Minimize"
          className="h-full w-10 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          title={isMaximized ? "Restore" : "Maximize"}
          className="h-full w-10 flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {isMaximized ? <Maximize2 size={11} /> : <Square size={11} />}
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          title="Close"
          className="h-full w-11 flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-500 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}