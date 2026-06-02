"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Smartphone, Trash2, 
  Scan, RefreshCw, Printer, ClipboardList, CheckCircle
} from "lucide-react";
import { WarrantyCase } from "@/components/CaseDrawer";

const COMMON_TECHS = [
  "Alejandro", "Soporte Técnico", "Técnico Especializado", "Encargado de Taller"
];

export default function EntregaTecnicoPage() {
  // Data States
  const [allCases, setAllCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdConduce, setCreatedConduce] = useState<{
    id: string;
    techName: string;
    caseCodes: string[];
  } | null>(null);
  
  // Envio States
  const [imeiInput, setImeiInput] = useState("");
  const [dispatchList, setDispatchList] = useState<WarrantyCase[]>([]);
  const [selectedTech, setSelectedTech] = useState("");
  const [isTechLocked, setIsTechLocked] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const techInputRef = useRef<HTMLInputElement>(null);

  // Cargar casos activos al montar
  const fetchActiveCases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/warranty?t=${Date.now()}`);
      const result = await response.json();
      if (response.ok && result.success) {
        // Nos interesan los casos con estado "Recibido"
        setAllCases(result.data || []);
      } else {
        throw new Error(result?.error || "Error al sincronizar datos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al obtener casos de garantía.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (!isTechLocked) {
          techInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 100);
    }
  };

  useEffect(() => {
    fetchActiveCases();
  }, []);

  // Agregar un IMEI a la lista de entrega
  const handleAddImei = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech.trim()) {
      toast.error("Debe ingresar o seleccionar un Técnico primero.");
      techInputRef.current?.focus();
      return;
    }

    const cleanImei = imeiInput.trim();
    if (!cleanImei) return;

    // Bloquear el técnico al agregar el primer equipo
    if (!isTechLocked) {
      setIsTechLocked(true);
    }

    // Buscar en la lista de todos los casos
    const matchingCases = allCases.filter((c) => c.imei === cleanImei);

    if (matchingCases.length === 0) {
      toast.error(`No se encontró ningún registro con el IMEI: ${cleanImei}`);
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Buscar si hay alguno que esté "Recibido" (en almacén central, listo para técnico)
    const targetCase = matchingCases.find((c) => c.status === "Recibido");

    if (!targetCase) {
      const alreadyAssigned = matchingCases.find((c) => c.status === "En reparación");
      if (alreadyAssigned) {
        toast.error(`El equipo con IMEI ${cleanImei} ya fue ENTREGADO al técnico previamente.`);
      } else {
        toast.error(`El equipo con IMEI ${cleanImei} no está en estado "Recibido" (Estado actual: ${matchingCases[0].status}).`);
      }
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Verificar si ya está en la lista actual de entrega
    const alreadyAdded = dispatchList.some((c) => c.id === targetCase.id);
    if (alreadyAdded) {
      toast.error("Este equipo ya está en la lista de entrega.");
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    setDispatchList((prev) => [...prev, targetCase]);
    toast.success(`Equipo agregado: ${targetCase.model}`);

    setImeiInput("");
    inputRef.current?.focus();
  };

  // Remover equipo de la lista
  const handleRemoveItem = (id: string) => {
    const updatedList = dispatchList.filter((c) => c.id !== id);
    setDispatchList(updatedList);
    
    // Si la lista queda vacía, no liberamos el técnico a menos que el usuario lo decida
    if (updatedList.length === 0) {
      toast.success("Lista vacía. Puede cambiar el técnico si lo desea.");
    } else {
      toast.success("Equipo removido de la lista.");
    }
    inputRef.current?.focus();
  };

  // Reiniciar todo el despacho actual
  const handleResetDispatch = () => {
    setDispatchList([]);
    setSelectedTech("");
    setIsTechLocked(false);
    setImeiInput("");
    toast.success("Módulo de asignación reiniciado.");
    setTimeout(() => techInputRef.current?.focus(), 100);
  };

  // Confirmar entrega al técnico y generar conduce
  const handleConfirmDispatch = async () => {
    if (dispatchList.length === 0) return;
    if (!selectedTech.trim()) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Asignando equipos al técnico...");

    try {
      // Actualizar estado de los equipos a "En reparación" en paralelo
      const updatePromises = dispatchList.map((item) =>
        fetch(`/api/warranty/${item.case_code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "En reparación" }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every((res) => res.ok);

      if (!allOk) {
        throw new Error("Uno o más equipos fallaron al actualizar el estado a En reparación.");
      }

      // Registrar el conduce en el historial
      const techNameSaved = selectedTech;
      const caseCodesArray = dispatchList.map((item) => item.case_code);
      
      const condRes = await fetch("/api/conduces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: techNameSaved,
          case_codes: caseCodesArray,
          is_tech: true,
        }),
      });
      
      const condResult = condRes.ok ? await condRes.json() : null;
      if (!condResult || !condResult.success) {
        throw new Error(
          condResult?.error || "Equipos asignados, pero falló el registro del conduce técnico en el historial."
        );
      }

      toast.success("¡Equipos entregados al técnico con éxito!", { id: toastId });
      
      // Guardar información del conduce creado para la pantalla de éxito
      setCreatedConduce({
        id: condResult.data?.id || "TECN-Generado",
        techName: techNameSaved,
        caseCodes: caseCodesArray,
      });

      // Limpiar estados y re-cargar registros de la API
      setDispatchList([]);
      setSelectedTech("");
      setIsTechLocked(false);
      fetchActiveCases();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Error al procesar el envío al técnico",
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
          Señal Digital - MÓDULO DE ASIGNACIÓN A TÉCNICO INTERNO
        </span>
      </div>

      {/* Título de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600 text-black p-2 border border-amber-700">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
              ENTREGA A TÉCNICO DE TALLER
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              Asignación interna de equipos de garantía para reparación física
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
        <div className="w-full bg-[#121212] border border-amber-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 translate-x-12 -translate-y-12 rotate-45 border-b border-amber-500/20" />
          
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-amber-600 text-black p-2 border border-amber-700 shrink-0">
              <CheckCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase font-mono-terminal tracking-wide">
                Asignación al Técnico Registrada
              </h2>
              <p className="text-sm text-zinc-400">
                Se han asignado {createdConduce.caseCodes.length} equipos al técnico <strong className="text-white">{createdConduce.techName}</strong>.
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-850 p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[10px] tracking-wider text-zinc-500 font-mono-terminal uppercase block mb-1">
                CÓDIGO DE CONDUCE DE ASIGNACIÓN
              </span>
              <span className="text-md font-mono-terminal font-bold text-amber-500 tracking-wider">
                {createdConduce.id}
              </span>
              <span className="text-[10px] tracking-wider text-zinc-650 font-mono-terminal block mt-2">
                EQUIPOS: {createdConduce.caseCodes.join(", ")}
              </span>
            </div>
            
            <a
              href={`/conduce?cases=${createdConduce.caseCodes.join(",")}&type=tecnico&tecnico=${encodeURIComponent(createdConduce.techName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-5 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer shrink-0 no-underline"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR CONDUCE TÉCNICO</span>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end border-t border-zinc-900 pt-5">
            <button
              onClick={() => setCreatedConduce(null)}
              className="px-5 py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
            >
              ASIGNAR MÁS EQUIPOS
            </button>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-zinc-950 border border-amber-500/20 hover:border-amber-500 text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer text-center no-underline inline-flex items-center justify-center"
            >
              IR AL PANEL GENERAL
            </Link>
          </div>
        </div>
      ) : (
        /* Caja Principal */
        <div className="grid grid-cols-1 gap-6">
          
          {/* Panel Superior: Técnico y Escaneo */}
          <div className="bg-[#121212] border border-zinc-850 p-6 flex flex-col md:flex-row gap-6">
            
            {/* Formulario Técnico */}
            <div className="w-full md:w-80 space-y-3">
              <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase font-bold">
                1. Seleccionar Técnico de Taller
              </label>
              <div className="space-y-2">
                <input
                  ref={techInputRef}
                  type="text"
                  placeholder="Escriba o seleccione técnico..."
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  disabled={isTechLocked || isLoading || isSubmitting}
                  list="tech-suggestions"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-none font-mono-terminal tracking-wider text-sm placeholder:text-zinc-700 disabled:opacity-60"
                  autoComplete="off"
                />
                <datalist id="tech-suggestions">
                  {COMMON_TECHS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                
                {isTechLocked ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-amber-500 font-mono-terminal uppercase font-semibold">
                      Técnico Fijado para esta asignación
                    </span>
                    <button
                      onClick={() => setIsTechLocked(false)}
                      className="text-[9px] text-red-400 hover:text-red-300 font-mono-terminal uppercase tracking-wider underline cursor-pointer text-left w-fit"
                    >
                      Cambiar Técnico
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-zinc-500 font-mono-terminal block">
                    Indique el técnico interno que se encargará del lote.
                  </span>
                )}
              </div>
            </div>

            {/* Formulario Escaneo/Entrada */}
            <div className="flex-1 w-full border-t md:border-t-0 md:border-l border-zinc-850 pt-6 md:pt-0 md:pl-6">
              <form onSubmit={handleAddImei} className="space-y-3">
                <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase font-bold">
                  2. Escanear o Escribir IMEI del Equipo (En Almacén / Recibido)
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
                    disabled={isLoading || isSubmitting || !imeiInput || !selectedTech.trim()}
                    className="px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Panel Inferior: Tabla de Envío */}
          <div className="bg-[#121212] border border-zinc-850 overflow-hidden flex flex-col min-h-[300px]">
            
            <div className="bg-[#161616] px-4 py-3 border-b border-zinc-850 flex justify-between items-center select-none">
              <span className="text-xs font-mono-terminal font-bold text-zinc-300 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                <span>EQUIPOS A ENTREGAR AL TÉCNICO ({dispatchList.length} EQUIPOS)</span>
              </span>
              {dispatchList.length > 0 && (
                <button
                  onClick={handleResetDispatch}
                  className="text-[10px] text-zinc-500 hover:text-red-400 font-mono-terminal uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {dispatchList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-600 font-mono-terminal gap-2 min-h-[250px] text-center select-none">
                <Smartphone className="w-8 h-8 text-zinc-800" />
                <p className="text-xs">No hay equipos agregados en la lista de asignación actual.</p>
                <p className="text-[10px] text-zinc-700">Escriba el técnico y luego ingrese o escanee un IMEI arriba para iniciar.</p>
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
                        <th className="p-3 text-center">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {dispatchList.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3 font-mono-terminal text-amber-500 font-bold">{item.case_code}</td>
                          <td className="p-3 font-semibold text-white">{item.model}</td>
                          <td className="p-3 font-mono-terminal text-zinc-350">{item.imei}</td>
                          <td className="p-3 text-zinc-450 italic truncate max-w-[200px]">{item.problem}</td>
                          <td className="p-3 text-zinc-400">{item.client_name}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 border border-zinc-850 hover:border-red-950/60 bg-zinc-950 text-zinc-500 hover:text-red-400 hover:bg-red-950/15 transition-all cursor-pointer"
                              title="Remover de la entrega"
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
                    onClick={handleConfirmDispatch}
                    disabled={isSubmitting || dispatchList.length === 0}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-2 shadow-lg disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Registrando Asignación...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>Confirmar Entrega y Imprimir Conduce Asignación ({dispatchList.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full mt-12 text-center text-[10px] text-zinc-650 font-mono-terminal uppercase tracking-widest no-print select-none">
        YACELLTECH AUTOMATION WORKSPACE &copy; 2026.
      </footer>
    </div>
  );
}
