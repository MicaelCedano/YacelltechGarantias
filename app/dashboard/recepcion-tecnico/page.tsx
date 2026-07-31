"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Smartphone, CheckSquare, Trash2, 
  Scan, RefreshCw, ClipboardList, RotateCcw, ArrowRight, Printer, CheckCircle
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { WarrantyCase } from "@/components/CaseDrawer";

export default function RecepcionTecnicoPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("yacelltech_role="));
      const role = match ? match.split("=")[1] : null;
      if (role === "tecnico") {
        toast.error("El rol técnico no tiene acceso a este módulo.");
        router.push("/dashboard");
      }
    }
  }, [router]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"reparados" | "sin_reparar">("reparados");

  // Data States
  const [allCases, setAllCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdConduce, setCreatedConduce] = useState<{
    id: string;
    caseCodes: string[];
    type: "reparados" | "sin_reparar";
  } | null>(null);
  
  // Recepcion States
  const [imeiInput, setImeiInput] = useState("");
  const [receiveList, setReceiveList] = useState<WarrantyCase[]>([]);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar casos activos al montar
  const fetchActiveCases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/warranty");
      const result = await response.json();
      if (response.ok && result.success) {
        setAllCases(result.data || []);
      } else {
        throw new Error(result?.error || "Error al sincronizar datos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al obtener casos de garantía.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    fetchActiveCases();
  }, []);

  // Cambiar de pestaña
  const handleTabChange = (tab: "reparados" | "sin_reparar") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setReceiveList([]);
    setImeiInput("");
    setCreatedConduce(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Agregar un IMEI a la lista de recepción
  const handleAddImei = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanImei = imeiInput.trim();
    if (!cleanImei) return;

    // Buscar en la lista de todos los casos
    const matchingCases = allCases.filter((c) => c.imei === cleanImei);

    if (matchingCases.length === 0) {
      toast.error(`No se encontró ningún registro con el IMEI: ${cleanImei}`);
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Buscar si hay alguno que esté "En reparación" (en manos del técnico)
    const targetCase = matchingCases.find((c) => c.status === "En reparación");

    if (!targetCase) {
      if (activeTab === "reparados") {
        const isAlreadyReceived = matchingCases.find((c) => c.status === "Recibido del técnico");
        if (isAlreadyReceived) {
          toast.error(`El equipo con IMEI ${cleanImei} ya figura como RECIBIDO del técnico.`);
        } else {
          toast.error(`El equipo con IMEI ${cleanImei} no está en estado "En reparación" (Estado actual: ${matchingCases[0].status}).`);
        }
      } else {
        const isAlreadyRecibido = matchingCases.find((c) => c.status === "Recibido");
        if (isAlreadyRecibido) {
          toast.error(`El equipo con IMEI ${cleanImei} ya figura en estado "Recibido" (Almacén central).`);
        } else {
          toast.error(`El equipo con IMEI ${cleanImei} no está en estado "En reparación" (Estado actual: ${matchingCases[0].status}).`);
        }
      }
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Verificar si ya está en la lista de recepción actual
    const alreadyAdded = receiveList.some((c) => c.id === targetCase.id);
    if (alreadyAdded) {
      toast.error("Este equipo ya está en la lista de recepción.");
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    setReceiveList((prev) => [...prev, targetCase]);
    toast.success(`Equipo agregado: ${targetCase.model}`);
    setImeiInput("");
    inputRef.current?.focus();
  };

  // Remover equipo de la lista
  const handleRemoveItem = (id: string) => {
    setReceiveList((prev) => prev.filter((c) => c.id !== id));
    toast.success("Equipo removido de la lista.");
    inputRef.current?.focus();
  };

  // Reiniciar todo
  const handleReset = () => {
    setReceiveList([]);
    setImeiInput("");
    toast.success("Lista de recepción limpiada.");
    inputRef.current?.focus();
  };

  // Confirmar recepción masiva del técnico
  const handleConfirmReceive = async () => {
    if (receiveList.length === 0) return;
    setIsSubmitting(true);
    
    const targetStatus = activeTab === "reparados" ? "Recibido del técnico" : "Recibido";
    const actionLabel = activeTab === "reparados" 
      ? "Registrando recepción desde el técnico..." 
      : "Retornando equipos a Recibidos (Sin reparar)...";

    const toastId = toast.loading(actionLabel);

    try {
      // Actualizar estado de los equipos en paralelo
      const updatePromises = receiveList.map((item) =>
        fetch(`/api/warranty/${item.case_code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: targetStatus }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every((res) => res.ok);

      if (!allOk) {
        throw new Error("Uno o más equipos fallaron al actualizar el estado de recepción.");
      }

      // Registrar el conduce en el historial
      const caseCodesArray = receiveList.map((item) => item.case_code);
      const techLabel = activeTab === "reparados" 
        ? "Técnico de Taller (Devolución Reparados)" 
        : "Técnico de Taller (Devolución Sin Reparar)";

      const condRes = await fetch("/api/conduces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: techLabel,
          case_codes: caseCodesArray,
          is_tech: true,
        }),
      });

      const condResult = condRes.ok ? await condRes.json() : null;

      toast.success(
        activeTab === "reparados" 
          ? `¡Se recibieron con éxito ${receiveList.length} equipos del técnico y se generó el conduce!`
          : `¡Se retornaron con éxito ${receiveList.length} equipos (sin reparar) a Recibidos y se generó el conduce!`, 
        { id: toastId }
      );

      // Guardar información del conduce para pantalla de éxito
      setCreatedConduce({
        id: condResult?.data?.id || "TECN-Generado",
        caseCodes: caseCodesArray,
        type: activeTab,
      });
      
      // Limpiar lista de recepción y re-cargar registros de la API
      setReceiveList([]);
      fetchActiveCases();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Error al procesar la recepción",
        { id: toastId }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl w-full mx-auto font-sans-sora text-[#f3f4f6]">
      
      {/* Botón de volver */}
      <div className="w-full flex justify-between items-center mb-6 no-print">
        <Link
          href="/dashboard"
          className="text-xs font-mono-terminal text-zinc-400 hover:text-amber-500 uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </Link>
        <span className="text-[10px] text-zinc-650 font-mono-terminal uppercase tracking-widest">
          Señal Digital - MÓDULO DE RECEPCIÓN DESDE TÉCNICO INTERNO
        </span>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex border border-zinc-800 mb-6 bg-zinc-950 p-1.5 gap-2 select-none">
        <button
          type="button"
          onClick={() => handleTabChange("reparados")}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-mono-terminal text-xs uppercase font-bold transition-all cursor-pointer rounded-none border ${
            activeTab === "reparados"
              ? "bg-emerald-950/50 border-emerald-500/70 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              : "bg-zinc-900/40 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          <CheckSquare className="w-4 h-4 text-emerald-400" />
          <span>1. Recibir Reparados (Listo p/ Entrega)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("sin_reparar")}
          className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-mono-terminal text-xs uppercase font-bold transition-all cursor-pointer rounded-none border ${
            activeTab === "sin_reparar"
              ? "bg-amber-950/50 border-amber-500/70 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
              : "bg-zinc-900/40 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>2. Recibir Sin Reparar / Sin Solución (Volver a Recibidos)</span>
        </button>
      </div>

      {/* Título de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 border text-white ${
            activeTab === "reparados" 
              ? "bg-emerald-600 border-emerald-700" 
              : "bg-amber-600 border-amber-700"
          }`}>
            {activeTab === "reparados" ? <CheckSquare className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white uppercase">
              {activeTab === "reparados" 
                ? "RECEPCIÓN DE TÉCNICO (REPARADOS)" 
                : "RECEPCIÓN DE TÉCNICO (SIN REPARAR / SIN SOLUCIÓN)"}
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              {activeTab === "reparados"
                ? "Ingreso de equipos devueltos por el técnico interno y listos para entrega al cliente"
                : "Retorno a la lista de 'Recibidos' (almacén central) para equipos no reparados o sin solución"}
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchActiveCases}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 transition-all cursor-pointer text-[10px] tracking-wider font-bold font-mono-terminal rounded-none w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
          <span>ACTUALIZAR DATOS</span>
        </button>
      </div>

      {createdConduce ? (
        /* Pantalla de Éxito Post-Registro */
        <div className="w-full bg-[#121212] border border-emerald-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 translate-x-12 -translate-y-12 rotate-45 border-b border-emerald-500/20" />
          
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-emerald-600 text-white p-2 border border-emerald-700 shrink-0">
              <CheckCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase font-mono-terminal tracking-wide">
                Recepción desde Técnico Registrada
              </h2>
              <p className="text-sm text-zinc-400">
                Se han recibido {createdConduce.caseCodes.length} equipos del técnico ({createdConduce.type === "reparados" ? "Reparados" : "Sin Reparar / Sin Solución"}).
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-850 p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[10px] tracking-wider text-zinc-500 font-mono-terminal uppercase block mb-1">
                CÓDIGO DE CONDUCE DE RECEPCIÓN TÉCNICO
              </span>
              <span className="text-md font-mono-terminal font-bold text-emerald-400 tracking-wider">
                {createdConduce.id}
              </span>
              <span className="text-[10px] tracking-wider text-zinc-650 font-mono-terminal block mt-2">
                EQUIPOS: {createdConduce.caseCodes.join(", ")}
              </span>
            </div>
            
            <a
              href={`/conduce?cases=${createdConduce.caseCodes.join(",")}&type=recepcion_tecnico`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer shrink-0 no-underline"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR CONDUCE DE RECEPCIÓN TÉCNICO</span>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end border-t border-zinc-900 pt-5">
            <button
              onClick={() => setCreatedConduce(null)}
              className="px-5 py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
            >
              REALIZAR OTRA RECEPCIÓN
            </button>
          </div>
        </div>
      ) : null}

      {/* Caja Principal */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Panel Superior: Escaneo */}
        <div className="bg-[#121212] border border-zinc-850 p-6 flex flex-col md:flex-row gap-6 items-center">
          
          {/* Formulario Escaneo/Entrada */}
          <div className="flex-1 w-full">
            <form onSubmit={handleAddImei} className="space-y-3">
              <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase font-bold">
                {activeTab === "reparados"
                  ? "Escanear o Escribir IMEI del Equipo (En Reparación por el Técnico)"
                  : "Escanear o Escribir IMEI del Equipo Sin Reparar (En Reparación por el Técnico)"}
              </label>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ingrese los 15 dígitos del IMEI..."
                    value={imeiInput}
                    onChange={(e) => setImeiInput(e.target.value.replace(/\D/g, "").slice(0, 15))}
                    disabled={isLoading || isSubmitting}
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 text-white rounded-none font-mono-terminal tracking-wider text-sm placeholder:text-zinc-700"
                    autoComplete="off"
                  />
                  <Scan className="absolute left-3 top-3.5 w-4 h-4 text-zinc-650" />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || isSubmitting || !imeiInput}
                  className={`px-5 font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer text-white disabled:bg-zinc-800 disabled:text-zinc-500 ${
                    activeTab === "reparados"
                      ? "bg-emerald-650 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {activeTab === "reparados" ? "Recibir Reparado" : "Recibir Sin Reparar"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Panel Inferior: Tabla de Recepción */}
        <div className="bg-[#121212] border border-zinc-850 overflow-hidden flex flex-col min-h-[300px]">
          
          <div className="bg-[#161616] px-4 py-3 border-b border-zinc-850 flex justify-between items-center select-none">
            <span className="text-xs font-mono-terminal font-bold text-zinc-300 flex items-center gap-2">
              <ClipboardList className={`w-4 h-4 ${activeTab === "reparados" ? "text-emerald-500" : "text-amber-500"}`} />
              <span>
                {activeTab === "reparados"
                  ? `EQUIPOS REPARADOS A RECIBIR (${receiveList.length} EQUIPOS)`
                  : `EQUIPOS SIN REPARAR A RETORNAR A RECIBIDOS (${receiveList.length} EQUIPOS)`}
              </span>
            </span>
            {receiveList.length > 0 && (
              <button
                onClick={handleReset}
                className="text-[10px] text-zinc-500 hover:text-red-400 font-mono-terminal uppercase tracking-wider transition-colors cursor-pointer"
              >
                Limpiar lista
              </button>
            )}
          </div>

          {receiveList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-600 font-mono-terminal gap-2 min-h-[250px] text-center select-none">
              <Smartphone className="w-8 h-8 text-zinc-800" />
              <p className="text-xs">
                {activeTab === "reparados"
                  ? "No hay equipos agregados a la lista de recepción de reparados."
                  : "No hay equipos agregados a la lista de devolución sin reparar."}
              </p>
              <p className="text-[10px] text-zinc-700">Ingresa o escanea un IMEI arriba para iniciar.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Tabla de Equipos */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-950 text-zinc-500 font-mono-terminal uppercase tracking-wider border-b border-zinc-900 select-none">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Modelo</th>
                      <th className="p-3">IMEI</th>
                      <th className="p-3">Falla / Diagnóstico</th>
                      <th className="p-3">Propietario / Cliente</th>
                      <th className="p-3">Cambio de Estado</th>
                      <th className="p-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {receiveList.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-3 font-mono-terminal text-amber-500 font-bold">{item.case_code}</td>
                        <td className="p-3 font-semibold text-white">{item.model}</td>
                        <td className="p-3 font-mono-terminal text-zinc-350">{item.imei}</td>
                        <td className="p-3 text-zinc-450 italic truncate max-w-[200px]">{item.problem}</td>
                        <td className="p-3 text-zinc-400">{item.client_name}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={item.status} />
                            <ArrowRight className="w-3 h-3 text-zinc-600" />
                            <StatusBadge status={activeTab === "reparados" ? "Recibido del técnico" : "Recibido"} />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 border border-zinc-850 hover:border-red-950/60 bg-zinc-950 text-zinc-500 hover:text-red-400 hover:bg-red-950/15 transition-all cursor-pointer"
                            title="Remover de la lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botón de Confirmación */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-850 flex justify-end">
                <button
                  onClick={handleConfirmReceive}
                  disabled={isSubmitting || receiveList.length === 0}
                  className={`px-6 py-3 text-white font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-2 shadow-lg disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed ${
                    activeTab === "reparados"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      {activeTab === "reparados" ? (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span>Confirmar Recepción (Reparados) ({receiveList.length})</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Confirmar Retorno a Recibidos (Sin Reparar) ({receiveList.length})</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

