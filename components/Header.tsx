"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logoutUser, countPendingUsers } from "@/app/actions";
import { Terminal, LayoutDashboard, Plus, LogOut, RefreshCw, Layers, ClipboardList, Truck, CheckSquare, Menu, X, Users } from "lucide-react";
import toast from "react-hot-toast";

function readRoleCookie(): "admin" | "encargado" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("yacelltech_role="));
  if (!match) return null;
  const value = match.split("=")[1];
  if (value === "admin" || value === "encargado") return value;
  return null;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [role, setRole] = useState<"admin" | "encargado" | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setRole(readRoleCookie());
  }, [pathname]);

  // Cargar contador de pendientes (solo si hay rol alto; si no, queda en 0)
  useEffect(() => {
    if (!role) {
      setPendingCount(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const count = await countPendingUsers();
        if (!cancelled) setPendingCount(count);
      } catch {
        // Silenciar: si falla, no mostramos el badge
      }
    };
    load();
    // Refrescar cada 30 segundos
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role, pathname]);

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
    <header className="w-full mb-6 border-b border-zinc-800 pb-5 no-print select-none">
      
      {/* Barra Principal: Información del Sistema y Botón Menú en Móvil */}
      <div className="flex justify-between items-center w-full gap-4">
        
        {/* Logo del Sistema */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-black p-2 rounded-none border border-amber-600">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
              YACELLTECH
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest hidden sm:block">
              {isDashboard ? "PANEL DE CONTROL DE GARANTÍAS" : "SISTEMA DE ADMISIÓN DE GARANTÍAS v1.0"}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono-terminal uppercase tracking-widest block sm:hidden">
              {isDashboard ? "PANEL DE CONTROL" : "SISTEMA DE ADMISIÓN v1.0"}
            </p>
          </div>
        </div>

        {/* Botón de Menú Hamburguesa para Móviles */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-500 transition-all cursor-pointer rounded-none"
          title="Menú de navegación"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Controles de Navegación y Sesión en Escritorio (ocultos en móvil) */}
        <div className="hidden md:flex items-center gap-2 justify-end flex-wrap">
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
              {role && pathname !== "/dashboard/usuarios" && (
                <button
                  onClick={() => router.push("/dashboard/usuarios")}
                  className="relative inline-flex items-center gap-2 px-3 py-2 border border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
                  title="Gestión de Usuarios"
                >
                  <Users className="w-4 h-4" />
                  <span>Usuarios</span>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-amber-500 text-black text-[9px] font-bold font-mono-terminal flex items-center justify-center rounded-none border border-amber-600">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
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
      </div>

      {/* Menú de Navegación Desplegable en Móvil */}
      {isMenuOpen && (
        <div className="md:hidden w-full flex flex-col gap-1.5 bg-[#121212] border border-zinc-850 p-4 mt-4 transition-all duration-300">
          <span className="text-[10px] text-zinc-500 font-mono-terminal uppercase tracking-widest block mb-2 pb-1 border-b border-zinc-900">
            Navegación del Taller
          </span>
          {isDashboard ? (
            <>
              {pathname !== "/dashboard" && (
                <button
                  onClick={() => {
                    router.push("/dashboard");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Panel de Casos</span>
                </button>
              )}
              {pathname !== "/dashboard/historial-equipos" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/historial-equipos");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Historial Equipos</span>
                </button>
              )}
              {pathname !== "/dashboard/historial" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/historial");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Historial Conduces</span>
                </button>
              )}
              {pathname !== "/dashboard/despacho" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/despacho");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>Despacho</span>
                </button>
              )}
              {pathname !== "/dashboard/entrega-tecnico" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/entrega-tecnico");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <ClipboardList className="w-4 h-4 text-amber-500" />
                  <span>Entrega Técnico</span>
                </button>
              )}
              {pathname !== "/dashboard/recepcion-tecnico" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/recepcion-tecnico");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-emerald-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span>Recibo Técnico</span>
                </button>
              )}
              {pathname !== "/dashboard/envio-suplidor" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/envio-suplidor");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-blue-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>Envío Marca</span>
                </button>
              )}
              {pathname !== "/dashboard/recepcion-suplidor" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/recepcion-suplidor");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-purple-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <CheckSquare className="w-4 h-4 text-purple-500" />
                  <span>Recibo Marca</span>
                </button>
              )}
              {pathname !== "/dashboard/ingreso" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/ingreso");
                    setIsMenuOpen(false);
                  }}
                  className="w-full inline-flex items-center gap-3 px-3 py-2.5 bg-amber-500 text-black font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer text-left justify-start"
                >
                  <Plus className="w-4 h-4 text-black" />
                  <span>Ingresar Equipos</span>
                </button>
              )}
              {role && pathname !== "/dashboard/usuarios" && (
                <button
                  onClick={() => {
                    router.push("/dashboard/usuarios");
                    setIsMenuOpen(false);
                  }}
                  className="w-full relative inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
                >
                  <Users className="w-4 h-4" />
                  <span>Usuarios</span>
                  {pendingCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-[18px] px-1.5 bg-amber-500 text-black text-[9px] font-bold font-mono-terminal flex items-center justify-center rounded-none">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => {
                router.push("/dashboard");
                setIsMenuOpen(false);
              }}
              className="w-full inline-flex items-center gap-3 px-3 py-2.5 border border-zinc-850 bg-zinc-950 text-zinc-400 hover:text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Panel de Casos</span>
            </button>
          )}

          {/* Botón Logout Móvil */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full inline-flex items-center gap-3 px-3 py-2.5 mt-2 border border-red-950/40 bg-red-950/10 hover:bg-red-950/30 text-red-400 hover:text-red-300 font-mono-terminal text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none text-left"
          >
            {isLoggingOut ? (
              <RefreshCw className="w-4 h-4 animate-spin text-red-400 shrink-0" />
            ) : (
              <LogOut className="w-4 h-4 shrink-0" />
            )}
            <span className="font-bold">Cerrar Sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}



