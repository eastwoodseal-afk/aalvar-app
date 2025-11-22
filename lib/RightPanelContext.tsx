"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type RightPanelType =
  | { type: "shot"; shot: any }
  | { type: "modal"; modal: "crear-shot" | "auth" }
  | null;

interface RightPanelContextValue {
  rightPanel: RightPanelType;
  setRightPanel: (panel: RightPanelType) => void;
}

const RightPanelContext = createContext<RightPanelContextValue | undefined>(undefined);

export function useRightPanel() {
  const ctx = useContext(RightPanelContext);
  if (!ctx) throw new Error("useRightPanel must be used within RightPanelProvider");
  return ctx;
}

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [rightPanel, setRightPanel] = useState<RightPanelType>(null);
  return (
    <RightPanelContext.Provider value={{ rightPanel, setRightPanel }}>
      {children}
    </RightPanelContext.Provider>
  );
}
