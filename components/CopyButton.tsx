"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que el clic active filas de tablas o modales
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Copiado: "${text}"`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallo al copiar:", err);
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-mono-terminal border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-amber-500 hover:border-amber-500 transition-all rounded-none duration-100 cursor-pointer ${className}`}
      title="Copiar al portapapeles"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500 transition-transform scale-110" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {label && <span className="uppercase text-[10px] tracking-wider">{label}</span>}
    </button>
  );
}
