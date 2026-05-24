"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Smartphone, User, Trash2, 
  Scan, RefreshCw, Layers, Printer, ClipboardList
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { WarrantyCase } from "@/components/CaseDrawer";

export default function DespachoPage() {
  
  // Data States
  const [allCases, setAllCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dispatch States
  const [imeiInput, setImeiInput] = useState("");
  const [dispatchList, setDispatchList] = useState<WarrantyCase[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar casos activos al montar
  const fetchActiveCases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/warranty");
      const result = await response.json();
      if (response.ok && result.success) {
        // Guardamos todos los casos, pero en particular nos interesan los no entregados
        setAllCases(result.data || []);
      } else {
        throw new Error(result?.error || "Error al sincronizar datos.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al obtener casos de garantía para despacho.");
    } finally {
      setIsLoading(false);
      // Autofoco en el input de IMEI
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    fetchActiveCases();
  }, []);

  // Agregar un IMEI a la entrega
  const handleAddImei = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanImei = imeiInput.trim();
    if (!cleanImei) return;

    // Buscar en la lista de todos los casos
    // Priorizar casos no entregados
    const matchingCases = allCases.filter(
      (c) => c.imei === cleanImei
    );

    if (matchingCases.length === 0) {
      toast.error(`No se encontró ningún registro con el IMEI: ${cleanImei}`);
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Buscar si hay alguno que NO esté entregado
    const targetCase = matchingCases.find((c) => c.status !== "Entregado");

    // Si todos están entregados, avisamos
    if (!targetCase) {
      toast.error(`El equipo con IMEI ${cleanImei} ya fue ENTREGADO previamente.`);
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Verificar si ya está en la lista actual de despacho
    const alreadyAdded = dispatchList.some((c) => c.id === targetCase.id);
    if (alreadyAdded) {
      toast.error("Este equipo ya está en la lista de despacho.");
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Validar concordancia de cliente
    const clientNameNormalized = targetCase.client_name.trim();

    if (!selectedClient) {
      // Es el primer equipo: bloqueamos el cliente
      setSelectedClient(clientNameNormalized);
      setDispatchList([targetCase]);
      toast.success(`Cliente seleccionado: ${clientNameNormalized}`);
    } else {
      // Segundos y siguientes equipos: deben ser del mismo cliente
      if (selectedClient.toLowerCase() !== clientNameNormalized.toLowerCase()) {
        toast.error(
          `Equipo inválido. Pertenece al cliente "${clientNameNormalized}", pero el despacho actual es para "${selectedClient}".`
        );
        setImeiInput("");
        inputRef.current?.focus();
        return;
      }
      setDispatchList((prev) => [...prev, targetCase]);
      toast.success(`Equipo agregado: ${targetCase.model}`);
    }

    setImeiInput("");
    inputRef.current?.focus();
  };

  // Remover equipo de la lista
  const handleRemoveItem = (id: string) => {
    const updatedList = dispatchList.filter((c) => c.id !== id);
    setDispatchList(updatedList);
    
    // Si la lista queda vacía, liberamos el cliente seleccionado
    if (updatedList.length === 0) {
      setSelectedClient(null);
      toast.success("Despacho reiniciado. Cliente liberado.");
    } else {
      toast.success("Equipo removido de la lista.");
    }
    inputRef.current?.focus();
  };

  // Reiniciar todo el despacho actual
  const handleResetDispatch = () => {
    setDispatchList([]);
    setSelectedClient(null);
    setImeiInput("");
    toast.success("Lista de despacho limpiada.");
    inputRef.current?.focus();
  };

  // Confirmar despacho masivo y generar conduce
  const handleConfirmDispatch = async () => {
    if (dispatchList.length === 0) return;
    setIsSubmitting(true);
    
    const toastId = toast.loading("Registrando despacho en el sistema...");

    try {
      // Ejecutar las actualizaciones de estado en paralelo
      const updatePromises = dispatchList.map((item) =>
        fetch(`/api/warranty/${item.case_code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Entregado" }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every((res) => res.ok);

      if (!allOk) {
        throw new Error("Uno o más equipos fallaron al actualizar el estado de entrega.");
      }

      toast.success("¡Equipos entregados con éxito!", { id: toastId });
      
      // Registrar el conduce en el historial
      try {
        await fetch("/api/conduces", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_name: selectedClient,
            case_codes: dispatchList.map((item) => item.case_code),
          }),
        });
      } catch (logErr) {
        console.error("No se pudo registrar el conduce en el historial:", logErr);
      }
      
      // Crear string de códigos separados por coma
      const caseCodes = dispatchList.map((item) => item.case_code).join(",");
      
      // Abrir conduce en una pestaña nueva
      window.open(`/conduce?cases=${caseCodes}`, "_blank");

      // Limpiar estados y re-cargar registros de la API
      setDispatchList([]);
      setSelectedClient(null);
      fetchActiveCases();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Error al procesar el despacho",
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
          Señal Digital - MÓDULO DE DESPACHOS
        </span>
      </div>

      {/* Título de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2 border border-emerald-700">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
              DESPACHO DE EQUIPOS
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              Entrega de garantías y conduce de entrega
            </p>
          </div>
        </div>
        
        {/* Sincronizar stock */}
        <button
          onClick={fetchActiveCases}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 transition-all cursor-pointer text-[10px] tracking-wider font-bold font-mono-terminal rounded-none w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
          <span>ACTUALIZAR DATOS</span>
        </button>
      </div>

      {/* Caja Principal */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Panel Superior: Escaneo */}
        <div className="bg-[#121212] border border-zinc-850 p-6 flex flex-col md:flex-row gap-6 items-center">
          
          {/* Formulario Escaneo/Entrada */}
          <div className="flex-1 w-full">
            <form onSubmit={handleAddImei} className="space-y-3">
              <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase font-bold">
                Escanear o Escribir IMEI del Equipo
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
                  className="px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>

          {/* Estado del Despacho y Cliente Lock */}
          <div className="w-full md:w-80 bg-zinc-950 border border-zinc-900 p-4 flex flex-col justify-center min-h-[100px]">
            <span className="text-[9px] text-zinc-500 font-mono-terminal uppercase tracking-wider block mb-1">
              Cliente del Despacho
            </span>
            {selectedClient ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-bold text-white text-sm truncate">{selectedClient}</span>
                </div>
                <button
                  onClick={handleResetDispatch}
                  className="text-[9px] text-red-400 hover:text-red-300 font-mono-terminal uppercase tracking-wider underline cursor-pointer"
                >
                  Cambiar Cliente (Limpiar)
                </button>
              </div>
            ) : (
              <div className="text-zinc-650 text-xs italic font-mono-terminal">
                Esperando primer IMEI para fijar cliente...
              </div>
            )}
          </div>
        </div>

        {/* Panel Inferior: Tabla de Despacho */}
        <div className="bg-[#121212] border border-zinc-850 overflow-hidden flex flex-col min-h-[300px]">
          
          <div className="bg-[#161616] px-4 py-3 border-b border-zinc-850 flex justify-between items-center select-none">
            <span className="text-xs font-mono-terminal font-bold text-zinc-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <span>LISTA DE ENTREGA ({dispatchList.length} EQUIPOS)</span>
            </span>
            {dispatchList.length > 0 && (
              <button
                onClick={handleResetDispatch}
                className="text-[10px] text-zinc-500 hover:text-red-400 font-mono-terminal uppercase tracking-wider transition-colors cursor-pointer"
              >
                Limpiar lista
              </button>
            )}
          </div>

          {dispatchList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-600 font-mono-terminal gap-2 min-h-[250px] text-center select-none">
              <Smartphone className="w-8 h-8 text-zinc-800" />
              <p className="text-xs">No hay equipos agregados en la lista de despacho actual.</p>
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
                      <th className="p-3">Falla Diagnosticada</th>
                      <th className="p-3">Estado</th>
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
                        <td className="p-3"><StatusBadge status={item.status} /></td>
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
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-2 shadow-lg disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Procesando Despacho...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Confirmar Despacho y Imprimir Conduce ({dispatchList.length})</span>
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
