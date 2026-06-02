"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Search, Filter, RotateCw, Printer, ClipboardList, User, Smartphone
} from "lucide-react";
import { Header } from "@/components/Header";
import { WarrantyCase } from "@/components/CaseDrawer";

interface ConduceRecord {
  id: string;
  client_name: string;
  delivery_date: string;
  case_codes: string[];
  created_at: string;
}

export default function HistorialConducesPage() {
  // Data States
  const [conduces, setConduces] = useState<ConduceRecord[]>([]);
  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Cargar datos
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Cargar conduces e información de garantías en paralelo (desactivando caché del navegador)
      const timestamp = Date.now();
      const [conducesRes, casesRes] = await Promise.all([
        fetch(`/api/conduces?t=${timestamp}`),
        fetch(`/api/warranty?t=${timestamp}`)
      ]);

      const conducesResult = await conducesRes.json();
      const casesResult = await casesRes.json();

      if (conducesRes.ok && conducesResult.success) {
        setConduces(conducesResult.data || []);
      } else {
        throw new Error(conducesResult?.error || "Error al obtener historial de conduces.");
      }

      if (casesRes.ok && casesResult.success) {
        setCases(casesResult.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al sincronizar el historial de conduces.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Función para obtener información breve de los equipos asociados a un conduce
  const getConduceDevicesInfo = (caseCodes: string[]) => {
    return caseCodes.map(code => {
      const foundCase = cases.find(c => c.case_code.toUpperCase() === code.toUpperCase());
      if (foundCase) {
        return {
          code,
          model: foundCase.model,
          imei: foundCase.imei
        };
      }
      return { code, model: "Equipo", imei: "Desconocido" };
    });
  };

  // Filtrado de Conduces
  const filteredConduces = conduces.filter((item) => {
    // 1. Búsqueda por código de conduce o nombre de cliente
    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.case_codes.some(code => code.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Rango de fechas de entrega
    let matchesDate = true;
    if (dateFrom && item.delivery_date < dateFrom) {
      matchesDate = false;
    }
    if (dateTo && item.delivery_date > dateTo) {
      matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  // Obtener URL de Reimpresión de Conduce
  const getReprintUrl = (item: ConduceRecord) => {
    const codesParam = item.case_codes.join(",");
    const isSupplier = item.id.startsWith("SUPL-");
    const isTech = item.id.startsWith("TECN-");
    
    if (isSupplier) {
      return `/conduce?cases=${codesParam}&type=suplidor&suplidor=${encodeURIComponent(item.client_name)}`;
    } else if (isTech) {
      return `/conduce?cases=${codesParam}&type=tecnico&tecnico=${encodeURIComponent(item.client_name)}`;
    }
    return `/conduce?cases=${codesParam}`;
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
          Señal Digital - HISTORIAL DE CONTROL
        </span>
      </div>

      {/* Título de la Sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-black p-2 border border-amber-600">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-white">
              HISTORIAL DE CONDUCES GENERADOS
            </h1>
            <p className="text-xs text-zinc-500 font-mono-terminal uppercase tracking-widest">
              Registro histórico de entregas y despachos realizados
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 transition-all cursor-pointer text-[10px] tracking-wider font-bold font-mono-terminal rounded-none w-fit"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
          <span>SINCRONIZAR HISTORIAL</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[#121212] border border-zinc-850 p-4 mb-6">
        <h3 className="text-xs font-mono-terminal font-semibold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-2 border-b border-zinc-900 pb-2 select-none">
          <Filter className="w-3.5 h-3.5" />
          <span>Búsqueda e Historial</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Búsqueda por Texto */}
          <div className="relative">
            <label className="text-[10px] font-mono-terminal text-zinc-500 uppercase block mb-1">Buscar por Conduce, Cliente o Caso</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: COND-0523-001, Nisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none font-mono-terminal"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="text-[10px] font-mono-terminal text-zinc-500 uppercase block mb-1">Despacho Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="text-[10px] font-mono-terminal text-zinc-500 uppercase block mb-1">Despacho Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none"
            />
          </div>
        </div>

        {/* Reset de Filtros */}
        {(searchQuery || dateFrom || dateTo) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
              }}
              className="px-3 py-1 text-[10px] font-mono-terminal bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800 uppercase"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Conduces */}
      <div className="bg-[#121212] border border-zinc-850 overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-400 font-mono-terminal gap-3 flex-1 min-h-[300px]">
            <span className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
            <span>Cargando historial de conduces...</span>
          </div>
        ) : filteredConduces.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500 font-mono-terminal gap-2 flex-1 min-h-[300px] select-none">
            <ClipboardList className="w-8 h-8 text-zinc-700" />
            <span>No se encontraron conduces registrados en el historial.</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">

            {/* Vista de Escritorio: Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#161616] border-b border-zinc-800 font-mono-terminal uppercase tracking-wider text-zinc-400 select-none">
                    <th className="p-3.5 font-bold">Código Conduce</th>
                    <th className="p-3.5 font-bold">Receptor / Cliente</th>
                    <th className="p-3.5 font-bold">Fecha Despacho</th>
                    <th className="p-3.5 font-bold text-center">Dispositivos</th>
                    <th className="p-3.5 font-bold">Equipos Despachados</th>
                    <th className="p-3.5 font-bold text-center no-print">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredConduces.map((item) => {
                    const devices = getConduceDevicesInfo(item.case_codes);
                    
                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                        {/* Código Conduce */}
                        <td className="p-3.5 font-mono-terminal font-bold text-amber-500 tracking-wider">
                          {item.id}
                        </td>

                        {/* Cliente / Suplidor */}
                        <td className="p-3.5 font-medium text-white border-none">
                          <div className="flex items-center gap-1.5 mt-1">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{item.client_name}</span>
                            {item.id.startsWith("SUPL-") && (
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-950 border border-blue-800 text-blue-400 text-[8px] font-mono-terminal uppercase font-bold tracking-wider rounded-none">
                                MARCA / SUPLIDOR
                              </span>
                            )}
                            {item.id.startsWith("TECN-") && (
                              <span className="ml-2 px-1.5 py-0.5 bg-amber-950 border border-amber-800 text-amber-500 text-[8px] font-mono-terminal uppercase font-bold tracking-wider rounded-none">
                                TÉCNICO INTERNO
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Fecha de Despacho */}
                        <td className="p-3.5 font-mono-terminal text-zinc-400">
                          {item.delivery_date}
                        </td>

                        {/* Cantidad de Equipos */}
                        <td className="p-3.5 text-center font-bold text-zinc-300">
                          <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-850 rounded-none text-[10px]">
                            {item.case_codes.length} {item.case_codes.length === 1 ? "equipo" : "equipos"}
                          </span>
                        </td>

                        {/* Detalle breve de Equipos */}
                        <td className="p-3.5 text-zinc-400 font-mono-terminal">
                          <div className="flex flex-col gap-1.5 max-w-sm">
                            {devices.map((device, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-[11px] truncate" title={`IMEI: ${device.imei}`}>
                                <Smartphone className="w-3 h-3 text-zinc-650 shrink-0" />
                                <span className="text-zinc-300 font-bold">{device.model}</span>
                                <span className="text-zinc-600">({device.code})</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Acción de Reimpresión */}
                        <td className="p-3.5 text-center no-print">
                          <a
                            href={getReprintUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 border border-zinc-800 hover:border-amber-500 bg-zinc-950 hover:bg-amber-500 text-zinc-400 hover:text-black transition-all inline-flex items-center gap-1.5 cursor-pointer font-mono-terminal text-[10px] tracking-wider rounded-none font-bold no-underline"
                            title="Reimprimir Conduce de Entrega"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Reimprimir</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista de Móvil: Lista de Tarjetas */}
            <div className="md:hidden block divide-y divide-zinc-900 bg-zinc-950/20">
              {filteredConduces.map((item) => {
                const devices = getConduceDevicesInfo(item.case_codes);

                return (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-zinc-900/60 transition-colors border-b border-zinc-900 space-y-3"
                  >
                    {/* Fila 1: Código Conduce y Fecha */}
                    <div className="flex justify-between items-center">
                      <span className="font-mono-terminal text-amber-500 font-bold tracking-wider text-sm">
                        {item.id}
                      </span>
                      <span className="text-[10px] font-mono-terminal text-zinc-500">
                        {item.delivery_date}
                      </span>
                    </div>

                    {/* Fila 2: Receptor / Cliente / Tags */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-650 font-mono-terminal uppercase block">Receptor / Destinatario</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="font-bold text-white text-sm">{item.client_name}</span>
                        {item.id.startsWith("SUPL-") && (
                          <span className="px-1.5 py-0.5 bg-blue-950 border border-blue-800 text-blue-400 text-[8px] font-mono-terminal uppercase font-bold tracking-wider rounded-none shrink-0">
                            MARCA
                          </span>
                        )}
                        {item.id.startsWith("TECN-") && (
                          <span className="px-1.5 py-0.5 bg-amber-950 border border-amber-800 text-amber-500 text-[8px] font-mono-terminal uppercase font-bold tracking-wider rounded-none shrink-0">
                            TÉCNICO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila 3: Cantidad y Equipos */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="text-[9px] text-zinc-650 font-mono-terminal uppercase block">Equipos Despachados</span>
                        <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 rounded-none text-[10px] font-bold text-zinc-300">
                          {item.case_codes.length} {item.case_codes.length === 1 ? "unidad" : "unidades"}
                        </span>
                      </div>
                      
                      <div className="p-2.5 bg-zinc-950 border border-zinc-900/60 font-mono-terminal text-[11px] space-y-1.5 max-h-32 overflow-y-auto">
                        {devices.map((device, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-zinc-350 truncate">
                            <Smartphone className="w-3 h-3 text-zinc-600 shrink-0" />
                            <span className="text-zinc-200 font-semibold">{device.model}</span>
                            <span className="text-zinc-500">({device.code})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fila 4: Reimprimir */}
                    <div className="pt-2 border-t border-zinc-900/40">
                      <a
                        href={getReprintUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 border border-zinc-800 hover:border-amber-500 bg-zinc-950 hover:bg-amber-500 text-zinc-400 hover:text-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer font-mono-terminal text-[10px] tracking-wider rounded-none font-bold no-underline"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Reimprimir Conduce de Entrega</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
