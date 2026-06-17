"use client";

import { createContext, useContext, useState } from "react";

interface CommandConsoleContextValue {
  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
}

const CommandConsoleContext = createContext<CommandConsoleContextValue | null>(null);

export function CommandConsoleProvider({ children }: { children: React.ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <CommandConsoleContext.Provider
      value={{ helpOpen, openHelp: () => setHelpOpen(true), closeHelp: () => setHelpOpen(false) }}
    >
      {children}
    </CommandConsoleContext.Provider>
  );
}

export function useCommandConsole() {
  const ctx = useContext(CommandConsoleContext);
  if (!ctx) throw new Error("useCommandConsole must be used within CommandConsoleProvider");
  return ctx;
}
