"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logoutUser } from "@/app/actions";
import { Terminal, LayoutDashboard, Plus, LogOut, RefreshCw, Layers, ClipboardList, Truck, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const toastId = toast.loading("Cerrando sesión de este terminal...");
    
    try {
      const response = await logoutUser();
      
      if (!response.success) {
        throw new Error(response.error || "Fallo al desconectar.");
      }
      
      toast.success("Sesión terminada con éxito.", { id: toastId });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Error al cerrar la sesión en el servidor";
      toast.error(message, { id: toastId });
      setIsLoggingOut(false);
    }
  };

  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <header className="w-full mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-zinc-800 pb-5 no-print select-none">
      
      {/* Información del Sistema */}
      <div className="flex items-center gap-3">
        <div className="bg-amber-500 text-black p-2 rounded-none border border-amber-600">
          <Terminal className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
            YACELLTECH
          </h1>
          <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
            {isDashboard ? "PANEL DE CONTROL DE GARANTÍAS" : "SISTEMA DE ADMISIÓN DE GARANTÍAS v1.0"}
          </p>
        </div>
      </div>
      
      {/* Controles de Navegación y Sesión */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
        {isDashboard ? (
          <>
            {pathname !== "/dashboard" && (
              <button
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Panel de Casos</span>
              </button>
            )}
            {pathname !== "/dashboard/historial-equipos" && (
              <button
                onClick={() => router.push("/dashboard/historial-equipos")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Historial Equipos</span>
              </button>
            )}
            {pathname !== "/dashboard/historial" && (
              <button
                onClick={() => router.push("/dashboard/historial")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Historial Conduces</span>
              </button>
            )}
            {pathname !== "/dashboard/despacho" && (
              <button
                onClick={() => router.push("/dashboard/despacho")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Despacho</span>
              </button>
            )}
            {pathname !== "/dashboard/entrega-tecnico" && (
              <button
                onClick={() => router.push("/dashboard/entrega-tecnico")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <span>Entrega Técnico</span>
              </button>
            )}
            {pathname !== "/dashboard/recepcion-tecnico" && (
              <button
                onClick={() => router.push("/dashboard/recepcion-tecnico")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-emerald-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span>Recibo Técnico</span>
              </button>
            )}
            {pathname !== "/dashboard/envio-suplidor" && (
              <button
                onClick={() => router.push("/dashboard/envio-suplidor")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-blue-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <Truck className="w-4 h-4 text-blue-500" />
                <span>Envío Marca</span>
              </button>
            )}
            {pathname !== "/dashboard/recepcion-suplidor" && (
              <button
                onClick={() => router.push("/dashboard/recepcion-suplidor")}
                className="inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-purple-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
              >
                <CheckSquare className="w-4 h-4 text-purple-500" />
                <span>Recibo Marca</span>
              </button>
            )}
            {pathname !== "/dashboard/ingreso" && (
              <button
                onClick={() => router.push("/dashboard/ingreso")}
                className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ingresar Equipos</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Panel de Casos</span>
          </button>
        )}

        {/* Botón de Logout */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-950/40 bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
          title="Desvincular terminal"
        >
          {isLoggingOut ? (
            <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="hidden sm:inline font-bold">Cerrar Sesión</span>
        </button>
      </div>
    </header>
  );
}
