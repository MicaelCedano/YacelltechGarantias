"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Smartphone, CheckSquare, Trash2, 
  Scan, RefreshCw, ClipboardList
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { WarrantyCase } from "@/components/CaseDrawer";

export default function RecepcionSuplidorPage() {
  // Data States
  const [allCases, setAllCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
        // Guardamos todos los casos
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

    // Buscar si hay alguno que esté "Enviado al suplidor" (en el proveedor/marca)
    const targetCase = matchingCases.find((c) => c.status === "Enviado al suplidor");

    if (!targetCase) {
      const isAlreadyReceived = matchingCases.find((c) => c.status === "Recibido del suplidor");
      if (isAlreadyReceived) {
        toast.error(`El equipo con IMEI ${cleanImei} ya figura como RECIBIDO del suplidor.`);
      } else {
        toast.error(`El equipo con IMEI ${cleanImei} no está en estado "Enviado al suplidor" (Estado actual: ${matchingCases[0].status}).`);
      }
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Verificar si ya está en la lista actual de recepción
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

  // Confirmar recepción masiva del suplidor
  const handleConfirmReceive = async () => {
    if (receiveList.length === 0) return;
    setIsSubmitting(true);
    
    const toastId = toast.loading("Registrando entrada del suplidor...");

    try {
      // Actualizar estado de los equipos a "Recibido del suplidor" en paralelo
      const updatePromises = receiveList.map((item) =>
        fetch(`/api/warranty/${item.case_code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Recibido del suplidor" }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every((res) => res.ok);

      if (!allOk) {
        throw new Error("Uno o más equipos fallaron al actualizar el estado de recepción.");
      }

      toast.success(`¡Se recibieron con éxito ${receiveList.length} equipos del suplidor!`, { id: toastId });
      
      // Limpiar estados y re-cargar registros de la API
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
          Señal Digital - MÓDULO DE RECEPCIÓN DESDE SUPLIDOR
        </span>
      </div>

      {/* Título de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 text-white p-2 border border-purple-700">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
              RECEPCIÓN DESDE EL SUPLIDOR
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              Ingreso de retorno de equipos enviados a la marca y actualización de estado
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

      {/* Caja Principal */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Panel Superior: Escaneo */}
        <div className="bg-[#121212] border border-zinc-850 p-6 flex flex-col md:flex-row gap-6 items-center">
          
          {/* Formulario Escaneo/Entrada */}
          <div className="flex-1 w-full">
            <form onSubmit={handleAddImei} className="space-y-3">
              <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase font-bold">
                Escanear o Escribir IMEI del Equipo (Enviados al Suplidor)
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
                  className="px-5 bg-purple-650 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
                >
                  Recibir
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Panel Inferior: Tabla de Recepción */}
        <div className="bg-[#121212] border border-zinc-850 overflow-hidden flex flex-col min-h-[300px]">
          
          <div className="bg-[#161616] px-4 py-3 border-b border-zinc-850 flex justify-between items-center select-none">
            <span className="text-xs font-mono-terminal font-bold text-zinc-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-500" />
              <span>EQUIPOS A RECIBIR ({receiveList.length} EQUIPOS)</span>
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
              <p className="text-xs">No hay equipos agregados en la lista de recepción actual.</p>
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
                      <th className="p-3">Diagnóstico / Fallo</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Estado</th>
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
                  onClick={handleConfirmReceive}
                  disabled={isSubmitting || receiveList.length === 0}
                  className="px-6 py-3 bg-purple-650 hover:bg-purple-750 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-2 shadow-lg disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Registrando Recepción...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      <span>Confirmar Recepción del Suplidor ({receiveList.length})</span>
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
