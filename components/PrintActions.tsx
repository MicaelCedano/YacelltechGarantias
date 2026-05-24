"use client";

import React from "react";
import { Printer } from "lucide-react";

interface PrintActionsProps {
  printLabel: string;
  closeLabel?: string;
  isDarkTheme?: boolean;
}

export function PrintActions({
  printLabel,
  closeLabel = "Cerrar",
  isDarkTheme = false,
}: PrintActionsProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.close();
    }
  };

  // Clases CSS condicionales según el tema visual del contenedor
  const closeBtnClass = isDarkTheme
    ? "px-5 py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
    : "px-5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-650 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer";

  const printBtnClass = isDarkTheme
    ? "px-5 py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-600 hover:border-amber-700 text-black font-bold text-xs font-mono-terminal uppercase transition-all tracking-wider cursor-pointer rounded-none shadow-md inline-flex items-center gap-2"
    : "px-5 py-2 bg-amber-500 hover:bg-amber-600 border border-amber-600 text-black font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-1.5";

  return (
    <div className="mt-8 flex justify-end gap-3 no-print border-t border-zinc-900/10 dark:border-zinc-850 pt-5">
      <button
        onClick={handleClose}
        type="button"
        className={closeBtnClass}
      >
        {closeLabel}
      </button>
      <button
        onClick={handlePrint}
        type="button"
        className={printBtnClass}
      >
        <Printer className="w-4 h-4" />
        <span>{printLabel}</span>
      </button>
    </div>
  );
}
