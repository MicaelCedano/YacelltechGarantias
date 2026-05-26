"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Smartphone, Truck, Trash2, 
  Scan, RefreshCw, Printer, ClipboardList
} from "lucide-react";
import { WarrantyCase } from "@/components/CaseDrawer";

const COMMON_BRANDS = [
  "Blu", "Sunelan", "Samsung", "Apple", "Xiaomi", 
  "Motorola", "Oppo", "Realme", "Huawei", "ZTE"
];

export default function EnvioSuplidorPage() {
  // Data States
  const [allCases, setAllCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Envio States
  const [imeiInput, setImeiInput] = useState("");
  const [dispatchList, setDispatchList] = useState<WarrantyCase[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [isSupplierLocked, setIsSupplierLocked] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const supplierInputRef = useRef<HTMLInputElement>(null);

  // Cargar casos activos al montar
  const fetchActiveCases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/warranty");
      const result = await response.json();
      if (response.ok && result.success) {
        // Nos interesan los que están en taller (En reparación)
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
        if (!isSupplierLocked) {
          supplierInputRef.current?.focus();
        } else {
          inputRef.current?.focus();
        }
      }, 100);
    }
  };

  useEffect(() => {
    fetchActiveCases();
  }, []);

  // Agregar un IMEI a la lista de envío
  const handleAddImei = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier.trim()) {
      toast.error("Debe ingresar o seleccionar una Marca/Suplidor primero.");
      supplierInputRef.current?.focus();
      return;
    }

    const cleanImei = imeiInput.trim();
    if (!cleanImei) return;

    // Bloquear el suplidor al agregar el primer equipo
    if (!isSupplierLocked) {
      setIsSupplierLocked(true);
    }

    // Buscar en la lista de todos los casos
    const matchingCases = allCases.filter((c) => c.imei === cleanImei);

    if (matchingCases.length === 0) {
      toast.error(`No se encontró ningún registro con el IMEI: ${cleanImei}`);
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Buscar si hay alguno que esté "En reparación" (en el taller)
    const targetCase = matchingCases.find((c) => c.status === "En reparación");

    if (!targetCase) {
      const alreadySent = matchingCases.find((c) => c.status === "Enviado al suplidor");
      if (alreadySent) {
        toast.error(`El equipo con IMEI ${cleanImei} ya fue ENVIADO al suplidor previamente.`);
      } else {
        toast.error(`El equipo con IMEI ${cleanImei} no está en estado "En reparación" (Estado actual: ${matchingCases[0].status}).`);
      }
      setImeiInput("");
      inputRef.current?.focus();
      return;
    }

    // Verificar si ya está en la lista actual de envío
    const alreadyAdded = dispatchList.some((c) => c.id === targetCase.id);
    if (alreadyAdded) {
      toast.error("Este equipo ya está en la lista de envío.");
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
    
    // Si la lista queda vacía, no liberamos el suplidor a menos que el usuario lo decida
    if (updatedList.length === 0) {
      toast.success("Lista vacía. Puede cambiar el suplidor si lo desea.");
    } else {
      toast.success("Equipo removido de la lista.");
    }
    inputRef.current?.focus();
  };

  // Reiniciar todo el envío actual
  const handleResetDispatch = () => {
    setDispatchList([]);
    setSelectedSupplier("");
    setIsSupplierLocked(false);
    setImeiInput("");
    toast.success("Módulo reiniciado.");
    setTimeout(() => supplierInputRef.current?.focus(), 100);
  };

  // Confirmar envío al suplidor y generar conduce
  const handleConfirmDispatch = async () => {
    if (dispatchList.length === 0) return;
    if (!selectedSupplier.trim()) return;

    // Abrir una pestaña en blanco de forma síncrona antes del await para evadir el bloqueador de popups del navegador
    const conduceTab = window.open("about:blank", "_blank");

    setIsSubmitting(true);
    const toastId = toast.loading("Registrando envío al suplidor...");

    try {
      // Actualizar estado de los equipos a "Enviado al suplidor" en paralelo
      const updatePromises = dispatchList.map((item) =>
        fetch(`/api/warranty/${item.case_code}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Enviado al suplidor" }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const allOk = responses.every((res) => res.ok);

      if (!allOk) {
        if (conduceTab) conduceTab.close();
        throw new Error("Uno o más equipos fallaron al actualizar el estado del envío.");
      }

      toast.success("¡Equipos marcados como Enviados al Suplidor!", { id: toastId });
      
      // Registrar el conduce en el historial
      try {
        await fetch("/api/conduces", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_name: selectedSupplier,
            case_codes: dispatchList.map((item) => item.case_code),
            is_supplier: true,
          }),
        });
      } catch (logErr) {
        console.error("No se pudo registrar el conduce en el historial:", logErr);
      }
      
      // Crear string de códigos separados por coma
      const caseCodes = dispatchList.map((item) => item.case_code).join(",");
      
      // Redirigir la pestaña previamente abierta al conduce de suplidor
      const targetUrl = `/conduce?cases=${caseCodes}&type=suplidor&suplidor=${encodeURIComponent(selectedSupplier)}`;
      if (conduceTab) {
        conduceTab.location.href = targetUrl;
      } else {
        window.open(targetUrl, "_blank");
      }

      // Limpiar estados y re-cargar registros de la API
      setDispatchList([]);
      setSelectedSupplier("");
      setIsSupplierLocked(false);
      fetchActiveCases();
    } catch (err) {
      if (conduceTab) conduceTab.close();
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Error al procesar el envío",
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
          Señal Digital - MÓDULO DE ENVÍO A LA MARCA
        </span>
      </div>

      {/* Título de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 border border-blue-700">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
              ENVÍO A LA MARCA / SUPLIDOR
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              Despacho de garantías hacia soporte de la marca y generación de conduce
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
        
        {/* Panel Superior: Marca y Escaneo */}
        <div className="bg-[#121212] border border-zinc-855 p-6 flex flex-col md:flex-row gap-6">
          
          {/* Formulario Marca / Suplidor */}
          <div className="w-full md:w-80 space-y-3">
            <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase font-bold">
              1. Marca / Suplidor Destino
            </label>
            <div className="space-y-2">
              <input
                ref={supplierInputRef}
                type="text"
                placeholder="Escriba o seleccione..."
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                disabled={isSupplierLocked || isLoading || isSubmitting}
                list="brand-suggestions"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-none font-mono-terminal tracking-wider text-sm placeholder:text-zinc-700 disabled:opacity-60"
                autoComplete="off"
              />
              <datalist id="brand-suggestions">
                {COMMON_BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
              
              {isSupplierLocked ? (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-amber-500 font-mono-terminal uppercase font-semibold">
                    Destino Bloqueado para este envío
                  </span>
                  <button
                    onClick={() => setIsSupplierLocked(false)}
                    className="text-[9px] text-red-400 hover:text-red-300 font-mono-terminal uppercase tracking-wider underline cursor-pointer text-left w-fit"
                  >
                    Editar Destino
                  </button>
                </div>
              ) : (
                <span className="text-[9px] text-zinc-500 font-mono-terminal block">
                  Ingrese el nombre del suplidor donde enviará los equipos.
                </span>
              )}
            </div>
          </div>

          {/* Formulario Escaneo/Entrada */}
          <div className="flex-1 w-full border-t md:border-t-0 md:border-l border-zinc-850 pt-6 md:pt-0 md:pl-6">
            <form onSubmit={handleAddImei} className="space-y-3">
              <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase font-bold">
                2. Escanear o Escribir IMEI del Equipo (En Taller)
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
                  disabled={isLoading || isSubmitting || !imeiInput || !selectedSupplier.trim()}
                  className="px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
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
              <ClipboardList className="w-4 h-4 text-blue-500" />
              <span>EQUIPOS A DESPACHAR ({dispatchList.length} EQUIPOS)</span>
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
              <p className="text-xs">No hay equipos agregados en la lista de despacho actual.</p>
              <p className="text-[10px] text-zinc-700">Escriba el suplidor y luego ingrese o escanee un IMEI arriba para iniciar.</p>
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
                      <th className="p-3">Cliente Origen</th>
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
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-2 shadow-lg disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Registrando Envío...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Confirmar Envío y Imprimir Conduce ({dispatchList.length})</span>
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
