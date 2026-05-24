"use client";

import React from "react";
import { Printer } from "lucide-react";

interface PrintReceiptProps {
  className?: string;
}

export function PrintReceipt({ className = "" }: PrintReceiptProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      type="button"
      className={`no-print inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs font-mono-terminal uppercase transition-all tracking-wider cursor-pointer rounded-none border border-amber-600 hover:border-amber-700 shadow-md ${className}`}
    >
      <Printer className="w-4 h-4" />
      <span>Imprimir Recibo</span>
    </button>
  );
}
