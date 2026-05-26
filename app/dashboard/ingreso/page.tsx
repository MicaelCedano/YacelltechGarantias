"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Smartphone, User, FileText, Trash2, 
  Plus, RefreshCw, ClipboardList, Layers, Calendar, CheckCircle
} from "lucide-react";
import { Header } from "@/components/Header";
import { createWarrantyCases } from "@/app/actions";

interface TempDevice {
  imei: string;
  model: string;
  problem: string;
}

export default function IngresoPage() {
  const router = useRouter();

  // Obtener fecha de hoy en zona horaria local YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Common Header State
  const [clientName, setClientName] = useState("");
  const [entryDate, setEntryDate] = useState(getTodayDateString());
  const [status, setStatus] = useState("En reparación");

  // Device Intake State
  const [imei, setImei] = useState("");
  const [model, setModel] = useState("");
  const [problem, setProblem] = useState("");

  // Temp list of added devices
  const [devicesList, setDevicesList] = useState<TempDevice[]>([]);

  // UX States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCodes, setCreatedCodes] = useState<string[] | null>(null);

  // Refs
  const imeiInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete suggestions for models and clients
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([]);

  // Cargar modelos y clientes existentes para autocompletado
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch("/api/warranty");
        const result = await response.json();
        if (response.ok && result.success && Array.isArray(result.data)) {
          const uniqueModels: string[] = Array.from(
            new Set(
              result.data
                .map((item: { model?: string }) => item.model?.trim())
                .filter(Boolean)
            )
          );
          setModelSuggestions(uniqueModels);

          const uniqueClients = (Array.from(
            new Set(
              result.data
                .map((item: { client_name?: string }) => item.client_name?.trim())
                .filter(Boolean)
            )
          ) as string[]).sort((a, b) => a.localeCompare(b));
          setClientSuggestions(uniqueClients);
        }
      } catch (err) {
        console.error("Error al cargar sugerencias de autocompletado:", err);
      }
    };
    fetchSuggestions();
  }, []);

  // Validations
  const isImeiValid = imei.length === 15 && /^\d+$/.test(imei);
  const isDeviceValid = isImeiValid && model.trim().length > 0 && problem.trim().length > 0;
  const isBatchReady = devicesList.length > 0 && clientName.trim().length > 0 && entryDate !== "";

  // Reset form completely
  const handleFullReset = () => {
    setClientName("");
    setEntryDate(getTodayDateString());
    setStatus("En reparación");
    setImei("");
    setModel("");
    setProblem("");
    setDevicesList([]);
    setCreatedCodes(null);
  };

  // Agregar equipo actual a la lista temporal
  const handleAddDeviceToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeviceValid) {
      toast.error("Por favor complete los datos del dispositivo correctamente.");
      return;
    }

    // Verificar si el IMEI ya fue agregado a la lista temporal para evitar duplicados
    if (devicesList.some((d) => d.imei === imei)) {
      toast.error("Este IMEI ya está en la lista temporal de admisión.");
      return;
    }

    const newDevice: TempDevice = {
      imei,
      model: model.trim(),
      problem: problem.trim(),
    };

    setDevicesList((prev) => [...prev, newDevice]);
    
    // Limpiar campos del dispositivo e ir al input de IMEI
    setImei("");
    setModel("");
    setProblem("");
    toast.success("Dispositivo agregado a la lista.");
    setTimeout(() => imeiInputRef.current?.focus(), 100);
  };

  // Remover equipo de la lista temporal
  const handleRemoveDeviceFromList = (index: number) => {
    setDevicesList((prev) => prev.filter((_, idx) => idx !== index));
    toast.success("Dispositivo removido.");
  };

  // Enviar el lote a la base de datos
  const handleProcessBatch = async () => {
    if (!isBatchReady) return;

    // Abrir una pestaña en blanco de forma síncrona antes del await para evadir el bloqueador de popups del navegador
    const receiptTab = window.open("about:blank", "_blank");

    setIsSubmitting(true);
    const toastId = toast.loading("Ingresando garantías al servidor...");

    try {
      const response = await createWarrantyCases({
        client_name: clientName,
        entry_date: entryDate,
        status,
        devices: devicesList,
      });

      if (!response.success || !response.case_codes) {
        if (receiptTab) receiptTab.close();
        throw new Error(response.error || "Error al procesar ingreso.");
      }

      toast.success("¡Ingreso registrado exitosamente!", { id: toastId, duration: 4000 });
      setCreatedCodes(response.case_codes);

      // Guardar nuevo cliente y nuevos modelos registrados en el autocompletado local
      if (clientName.trim()) {
        setClientSuggestions((prev) => Array.from(new Set([...prev, clientName.trim()])).sort((a, b) => a.localeCompare(b)));
      }
      const newModels = devicesList.map((d) => d.model.trim()).filter(Boolean);
      setModelSuggestions((prev) => Array.from(new Set([...prev, ...newModels])));
      
      // Redirigir la pestaña previamente abierta al conduce de recibo generado
      const codesParam = response.case_codes.join(",");
      if (receiptTab) {
        receiptTab.location.href = `/receipt?cases=${codesParam}`;
      } else {
        window.open(`/receipt?cases=${codesParam}`, "_blank");
      }
    } catch (err) {
      if (receiptTab) receiptTab.close();
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Fallo al conectar con el servidor", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl w-full mx-auto font-sans-sora text-[#f3f4f6]">
      {/* Header Compartido */}
      <Header />

      {/* Botón de volver */}
      <div className="w-full flex justify-between items-center mb-6 no-print select-none">
        <Link
          href="/dashboard"
          className="text-xs font-mono-terminal text-zinc-400 hover:text-amber-500 uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </Link>
        <span className="text-[10px] text-zinc-650 font-mono-terminal uppercase tracking-widest">
          Señal Digital - TERMINAL DE INGRESO
        </span>
      </div>

      {/* Título */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-black p-2 border border-amber-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
              INGRESO DE GARANTÍAS
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              Admisión rápida y generación de conduce de recibo para dispositivos
            </p>
          </div>
        </div>
      </div>

      {createdCodes ? (
        /* Pantalla de Éxito Post-Registro */
        <div className="w-full bg-[#121212] border border-emerald-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 translate-x-12 -translate-y-12 rotate-45 border-b border-emerald-500/20" />
          
          <div className="flex items-start gap-4 mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-white uppercase font-mono-terminal tracking-wide">
                Ingreso Exitoso
              </h2>
              <p className="text-sm text-zinc-400">
                Se han creado {createdCodes.length} registros de garantías consecutivas para {clientName}.
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-850 p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-[10px] tracking-wider text-zinc-500 font-mono-terminal uppercase block mb-1">
                CÓDIGOS GENERADOS
              </span>
              <span className="text-md font-mono-terminal font-bold text-amber-500 tracking-wider break-all">
                {createdCodes.join(", ")}
              </span>
            </div>
            
            <a
              href={`/receipt?cases=${createdCodes.join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-5 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-mono-terminal text-xs uppercase tracking-wider font-bold transition-all rounded-none cursor-pointer shrink-0"
            >
              <ClipboardList className="w-4 h-4" />
              <span>VER CONDUCE DE RECEPCIÓN</span>
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end border-t border-zinc-900 pt-5">
            <button
              onClick={handleFullReset}
              className="px-5 py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
            >
              NUEVO INGRESO
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2.5 bg-zinc-950 border border-amber-500/20 hover:border-amber-500 text-amber-500 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
            >
              IR AL PANEL GENERAL
            </button>
          </div>
        </div>
      ) : (
        /* Formulario de Captura */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Columna Izquierda: Formularios (Datos comunes y Adición) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Datos comunes */}
            <div className="bg-[#121212] border border-zinc-850 p-5">
              <h3 className="text-xs font-mono-terminal font-semibold uppercase tracking-wider text-amber-500 mb-4 border-b border-zinc-900 pb-2">
                1. Información del Cliente
              </h3>
              
              <div className="space-y-4">
                {/* Nombre de Cliente */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Inversiones Pérez, Carlos M."
                    value={clientName}
                    disabled={devicesList.length > 0}
                    onChange={(e) => setClientName(e.target.value)}
                    list="client-suggestions"
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none focus:outline-hidden focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <datalist id="client-suggestions">
                    {clientSuggestions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {devicesList.length > 0 && (
                    <span className="text-[9px] text-zinc-500 font-mono-terminal mt-1">
                      Nombre bloqueado (remover todos los equipos agregados para editar).
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Fecha */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      Fecha de Ingreso *
                    </label>
                    <input
                      type="date"
                      required
                      value={entryDate}
                      disabled={devicesList.length > 0}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none focus:outline-hidden focus:border-amber-500 disabled:opacity-60"
                    />
                  </div>

                  {/* Estado inicial */}
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-zinc-500" />
                      Estado Inicial *
                    </label>
                    <select
                      value={status}
                      disabled={devicesList.length > 0}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal uppercase rounded-none cursor-pointer focus:outline-hidden focus:border-amber-500 disabled:opacity-60"
                    >
                      <option value="En reparación">En reparación</option>
                      <option value="Entregado">Entregado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Formulario de Dispositivo */}
            <form onSubmit={handleAddDeviceToList} className="bg-[#121212] border border-zinc-850 p-5">
              <h3 className="text-xs font-mono-terminal font-semibold uppercase tracking-wider text-amber-500 mb-4 border-b border-zinc-900 pb-2">
                2. Datos del Equipo
              </h3>

              <div className="space-y-4">
                {/* IMEI */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                    IMEI del Dispositivo (15 dígitos) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={15}
                      ref={imeiInputRef}
                      placeholder="Ingrese IMEI del equipo"
                      value={imei}
                      onChange={(e) => setImei(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none focus:outline-hidden focus:border-amber-500 font-mono-terminal tracking-wider pr-14"
                    />
                    <div className="absolute right-2 top-1.5 text-[9px] font-mono-terminal bg-zinc-900 border border-zinc-850 px-1 py-0.5 text-zinc-500 font-bold select-none">
                      {imei.length}/15
                    </div>
                  </div>
                </div>

                {/* Modelo */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                    Modelo del Equipo *
                  </label>
                  <input
                    type="text"
                    ref={modelInputRef}
                    placeholder="Ej: Sunelan M8, Galaxy A15"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    list="model-suggestions"
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none focus:outline-hidden focus:border-amber-500"
                  />
                  <datalist id="model-suggestions">
                    {modelSuggestions.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* Diagnóstico */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-zinc-400 font-mono-terminal uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    Descripción Detallada del Fallo *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describa el problema del equipo..."
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none resize-y focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Botón agregar */}
                <button
                  type="submit"
                  disabled={!isDeviceValid || !clientName.trim()}
                  className="w-full h-9 inline-flex items-center justify-center gap-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 disabled:border-transparent text-amber-500 disabled:text-zinc-650 font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar a la lista</span>
                </button>
              </div>
            </form>

          </div>

          {/* Columna Derecha: Lista de Equipos y Confirmación */}
          <div className="lg:col-span-7 bg-[#121212] border border-zinc-850 p-5 flex flex-col min-h-[400px]">
            <h3 className="text-xs font-mono-terminal font-semibold uppercase tracking-wider text-amber-500 mb-4 border-b border-zinc-900 pb-2 flex items-center justify-between">
              <span>Equipos a Ingresar ({devicesList.length})</span>
              {clientName && (
                <span className="text-[10px] text-zinc-400 font-normal font-mono-terminal uppercase">
                  Receptor: {clientName}
                </span>
              )}
            </h3>

            {/* Listado */}
            <div className="flex-1 overflow-y-auto mb-6 max-h-[450px]">
              {devicesList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono-terminal gap-2 p-8">
                  <Smartphone className="w-10 h-10 text-zinc-800" />
                  <p className="text-xs text-center uppercase tracking-wider">
                    No hay equipos agregados.
                  </p>
                  <p className="text-[10px] text-zinc-700 text-center">
                    Ingrese el nombre del cliente a la izquierda, agregue los datos del dispositivo y presione &quot;Agregar a la lista&quot;.
                  </p>
                </div>
              ) : (
                <div className="border border-zinc-900 divide-y divide-zinc-900 text-xs">
                  {devicesList.map((item, index) => (
                    <div key={index} className="p-4 bg-zinc-950/20 hover:bg-zinc-950/50 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-terminal bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 text-[9px] text-amber-500 font-bold">
                            ITEM #{index + 1}
                          </span>
                          <span className="text-zinc-200 font-bold">{item.model}</span>
                        </div>
                        <p className="text-zinc-400 font-mono-terminal text-[11px] tracking-wider">
                          IMEI: {item.imei}
                        </p>
                        <p className="text-zinc-500 leading-relaxed font-mono-terminal text-[10px] pt-1">
                          Fallo: {item.problem}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveDeviceFromList(index)}
                        className="p-1 border border-zinc-900 hover:border-red-500 text-zinc-600 hover:text-red-500 bg-zinc-950 transition-colors cursor-pointer"
                        title="Remover equipo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="border-t border-zinc-900 pt-4 flex flex-col sm:flex-row justify-between gap-3 select-none">
              <button
                onClick={handleFullReset}
                disabled={devicesList.length === 0}
                className="px-4 py-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 disabled:bg-zinc-950 disabled:border-transparent text-zinc-400 hover:text-white disabled:text-zinc-700 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer disabled:cursor-not-allowed"
              >
                Limpiar formulario
              </button>
              
              <button
                onClick={handleProcessBatch}
                disabled={!isBatchReady || isSubmitting}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-650 disabled:border-transparent text-black font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2 justify-center"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar Equipos y Generar Conduce</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Footer */}
      <footer className="w-full mt-12 text-center text-[10px] text-zinc-600 font-mono-terminal uppercase tracking-widest no-print">
        YACELLTECH AUTOMATION WORKSPACE &copy; 2026.
      </footer>
    </div>
  );
}
