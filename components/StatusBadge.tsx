import React from "react";

export type WarrantyStatus = "En reparación" | "Enviado al suplidor" | "Recibido del suplidor" | "Entregado";

interface StatusBadgeProps {
  status: WarrantyStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  let bgClass = "";
  let borderClass = "";
  let textClass = "";

  switch (status) {
    case "En reparación":
      bgClass = "bg-amber-500";
      borderClass = "border-amber-650";
      textClass = "text-black font-bold";
      break;
    case "Enviado al suplidor":
      bgClass = "bg-blue-600";
      borderClass = "border-blue-700";
      textClass = "text-white font-bold";
      break;
    case "Recibido del suplidor":
      bgClass = "bg-purple-600";
      borderClass = "border-purple-700";
      textClass = "text-white font-bold";
      break;
    case "Entregado":
      bgClass = "bg-zinc-800";
      borderClass = "border-zinc-700";
      textClass = "text-zinc-400";
      break;
    default:
      bgClass = "bg-zinc-900";
      borderClass = "border-zinc-800";
      textClass = "text-zinc-500";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold tracking-wider font-mono-terminal uppercase border ${bgClass} ${borderClass} ${textClass} rounded-none select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 bg-current animate-pulse"></span>
      {status}
    </span>
  );
}
