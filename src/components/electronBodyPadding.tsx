"use client";

// components/ElectronBodyPadding.tsx
// Wraps all page content and adds 36px top padding only when running
// inside Electron. In a normal browser this renders as a plain passthrough.

import { useEffect, useState } from "react";

export function ElectronBodyPadding({ children }: { children: React.ReactNode }) {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsElectron(true);
    }
  }, []);

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={{ paddingTop: isElectron ? "36px" : "0px" }}
    >
      {children}
    </div>
  );
}