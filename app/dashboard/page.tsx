"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { CaseDrawer, WarrantyCase } from "@/components/CaseDrawer";
import { Header } from "@/components/Header";
import { 
  Search, Filter, RotateCw, Eye, ChevronDown, ChevronUp, Package, Printer, Check
} from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardPage() {
  // Data States
  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith("yacelltech_role="));
      if (match) {
        setRole(match.split("=")[1] || null);
      }
    }
  }, []);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // UI Interactive States
  const [selectedCase, setSelectedCase] = useState<WarrantyCase | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedImeis, setExpandedImeis] = useState<Record<string, boolean>>({});
  const [expandedProblems, setExpandedProblems] = useState<Record<string, boolean>>({});

  // Cargar registros
  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/warranty?t=${Date.now()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.error || "Error al sincronizar datos.");
      }

      setCases(result.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Error al obtener los casos de garantía.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Manejar el cambio de estado desde el Drawer
  const handleStatusUpdated = (updatedCase: WarrantyCase) => {
    setCases((prev) =>
      prev.map((c) => (c.id === updatedCase.id ? updatedCase : c))
    );
    setSelectedCase(updatedCase);
  };

  const handleCaseDeleted = (deletedCaseCode: string) => {
    setCases((prev) => prev.filter((c) => c.case_code !== deletedCaseCode));
    setSelectedCase(null);
  };

  // Abrir panel lateral
  const openCaseDetails = (warrantyCase: WarrantyCase) => {
    setSelectedCase(warrantyCase);
    setIsDrawerOpen(true);
  };

  // Entrega rápida y apertura del conduce
  const handleDeliverQuick = async (item: WarrantyCase, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const confirmDeliver = window.confirm(
      `¿Desea marcar el equipo de ${item.client_name} (Código: ${item.case_code}) como ENTREGADO y generar su Conduce de Entrega?`
    );
    
    if (!confirmDeliver) return;

    try {
      const response = await fetch(`/api/warranty/${item.case_code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Entregado" }),
      });

      const result = response.ok ? await response.json() : null;

      if (!result || !result.success) {
        throw new Error(result?.error || "Error al actualizar estado.");
      }

      // Registrar el conduce en el historial
      const condResponse = await fetch("/api/conduces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: item.client_name,
          case_codes: [item.case_code],
        }),
      });

      const condResult = condResponse.ok ? await condResponse.json() : null;
      if (!condResult || !condResult.success) {
        throw new Error(
          condResult?.error || "Equipo marcado como entregado, pero falló el registro en el historial de conduces."
        );
      }

      // Mostrar toast con enlace interactivo de impresión (evita el popup blocker)
      toast.success((t) => (
        <span className="flex flex-col gap-1 text-[11px] font-mono-terminal">
          <span>¡Equipo entregado con éxito!</span>
          <a
            href={`/conduce?cases=${item.case_code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-emerald-500 hover:text-emerald-400"
            onClick={() => toast.dismiss(t.id)}
          >
            IMPRIMIR CONDUCE
          </a>
        </span>
      ), { duration: 6000 });
      
      // Actualizar en el estado local de dashboard
      setCases((prev) =>
        prev.map((c) => (c.id === item.id ? result.case : c))
      );
      
      if (selectedCase && selectedCase.id === item.id) {
        setSelectedCase(result.case);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Fallo al procesar la entrega.");
    }
  };

  // Toggle de expansión IMEI
  const toggleImei = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedImeis((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle de expansión Problema
  const toggleProblem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProblems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtrado y ordenado de casos
  const filteredCases = cases
    .filter((item) => {
      // Solo mostrar pendientes (No entregados) en el dashboard
      if (item.status === "Entregado") return false;

      // 1. Filtro de búsqueda (IMEI, Modelo, Cliente)
      const matchesSearch =
        item.imei.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.client_name.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Filtro de rango de fechas
      let matchesDate = true;
      if (dateFrom && item.entry_date < dateFrom) {
        matchesDate = false;
      }
      if (dateTo && item.entry_date > dateTo) {
        matchesDate = false;
      }

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      // Ordenar primero los que están en estado "Recibido"
      const aIsRecibido = a.status === "Recibido";
      const bIsRecibido = b.status === "Recibido";
      if (aIsRecibido && !bIsRecibido) return -1;
      if (!aIsRecibido && bIsRecibido) return 1;
      return 0; // mantener orden cronológico original para el resto
    });

  // Estadísticas rápidas para la cabecera
  const stats = {
    total: cases.length,
    recibido: cases.filter((c) => c.status === "Recibido").length,
    reparacion: cases.filter((c) => c.status === "En reparación").length,
    recibidoTecnico: cases.filter((c) => c.status === "Recibido del técnico").length,
    enSuplidor: cases.filter((c) => c.status === "Enviado al suplidor").length,
    recibidoSuplidor: cases.filter((c) => c.status === "Recibido del suplidor").length,
    entregados: cases.filter((c) => c.status === "Entregado").length,
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl w-full mx-auto font-sans-sora">
      
      {/* Header Compartido */}
      <Header />

      {/* Panel de Estadísticas Fijas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-4 bg-zinc-900 border border-zinc-850 border-l-2 border-l-teal-500">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Recibidos (Nuevos)</span>
          <span className="text-xl font-mono-terminal font-bold text-teal-400">{stats.recibido}</span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-850 border-l-2 border-l-amber-500">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">En Taller (Téc)</span>
          <span className="text-xl font-mono-terminal font-bold text-amber-500">{stats.reparacion}</span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-850 border-l-2 border-l-emerald-500">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Recibidos de Téc</span>
          <span className="text-xl font-mono-terminal font-bold text-emerald-400">{stats.recibidoTecnico}</span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-850 border-l-2 border-l-blue-500">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">En Marca (Suplidor)</span>
          <span className="text-xl font-mono-terminal font-bold text-blue-500">{stats.enSuplidor}</span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-850 border-l-2 border-l-purple-500">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Recibidos de Marca</span>
          <span className="text-xl font-mono-terminal font-bold text-purple-500">{stats.recibidoSuplidor}</span>
        </div>
        <div className="p-4 bg-[#161616] border border-zinc-850 border-l-2 border-l-zinc-650">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Entregados Clientes</span>
          <span className="text-xl font-mono-terminal font-bold text-zinc-400">{stats.entregados}</span>
        </div>
      </div>

      {/* Sección de Filtros Utilitaria */}
      <div className="bg-[#121212] border border-zinc-850 p-4 mb-6">
        <h3 className="text-xs font-mono-terminal font-semibold uppercase tracking-wider text-amber-500 mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros de Búsqueda y Monitoreo</span>
          </div>
          <button
            onClick={fetchCases}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 transition-all cursor-pointer text-[10px] tracking-wider font-bold rounded-none"
            title="Sincronizar base de datos"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
            <span>SINCRONIZAR</span>
          </button>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Búsqueda por Texto */}
          <div className="relative">
            <label className="text-[10px] font-mono-terminal text-zinc-500 uppercase block mb-1">Buscar por IMEI, Equipo o Cliente</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej: A15, Carlos, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none focus:outline-hidden focus:border-amber-500"
              />
              <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-zinc-500" />
            </div>
          </div>

          {/* Rango de Fechas - Desde */}
          <div>
            <label className="text-[10px] font-mono-terminal text-zinc-500 uppercase block mb-1">Admisión Desde</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Rango de Fechas - Hasta */}
          <div>
            <label className="text-[10px] font-mono-terminal text-zinc-500 uppercase block mb-1">Admisión Hasta</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none focus:outline-hidden focus:border-amber-500"
              />
            </div>
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
              className="px-3 py-1 text-[10px] font-mono-terminal bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800 uppercase rounded-none"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-[#121212] border border-zinc-850 overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-400 font-mono-terminal gap-3 flex-1 min-h-[300px]">
            <span className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
            <span>Accediendo a base de datos de garantías...</span>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500 font-mono-terminal gap-2 flex-1 min-h-[300px]">
            <Package className="w-8 h-8 text-zinc-650" />
            <span>No se encontraron casos de garantía registrados.</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Vista de Escritorio: Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                
                {/* Encabezado */}
                <thead className="bg-[#161616] border-b border-zinc-800 font-mono-terminal uppercase tracking-wider text-zinc-400 select-none">
                  <tr>
                    <th className="p-3.5 font-bold">Código</th>
                    <th className="p-3.5 font-bold">IMEI</th>
                    <th className="p-3.5 font-bold">Modelo</th>
                    <th className="p-3.5 font-bold">Cliente</th>
                    <th className="p-3.5 font-bold">Diagnóstico / Problema</th>
                    <th className="p-3.5 font-bold">Estado</th>
                    <th className="p-3.5 font-bold">Fecha Admisión</th>
                    <th className="p-3.5 font-bold text-center no-print">Acciones</th>
                  </tr>
                </thead>

                {/* Contenido */}
                <tbody className="divide-y divide-zinc-900">
                  {filteredCases.map((item) => {
                    const isImeiExpanded = !!expandedImeis[item.id];
                    const isProblemExpanded = !!expandedProblems[item.id];
                    
                    return (
                      <tr
                        key={item.id}
                        onClick={() => openCaseDetails(item)}
                        className="hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                      >
                        {/* Código de Caso */}
                        <td className="p-3.5 font-mono-terminal text-amber-500 font-bold tracking-wider">
                          {item.case_code}
                        </td>

                        {/* IMEI Truncado / Expandible */}
                        <td className="p-3.5 font-mono-terminal text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <span 
                              onClick={(e) => toggleImei(item.id, e)}
                              className="hover:text-amber-500 transition-colors underline decoration-dotted cursor-pointer select-none"
                              title="Haz clic para expandir o contraer IMEI"
                            >
                              {isImeiExpanded 
                                ? item.imei 
                                : `${item.imei.slice(0, 6)}...${item.imei.slice(-4)}`
                              }
                            </span>
                            <CopyButton text={item.imei} />
                          </div>
                        </td>

                        {/* Modelo */}
                        <td className="p-3.5 font-medium text-white">
                          {item.model}
                        </td>

                        {/* Cliente */}
                        <td className="p-3.5 text-zinc-300">
                          {item.client_name}
                        </td>

                        {/* Problema (primeros 40 caracteres, expandible) */}
                        <td className="p-3.5 text-zinc-400 font-mono-terminal max-w-[200px]">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="block leading-relaxed">
                              {isProblemExpanded 
                                ? item.problem 
                                : item.problem.length > 40
                                  ? `${item.problem.slice(0, 40)}...`
                                  : item.problem
                              }
                            </span>
                            {item.problem.length > 40 && (
                              <button
                                onClick={(e) => toggleProblem(item.id, e)}
                                className="text-[10px] text-amber-500 hover:text-amber-400 font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer mt-0.5"
                              >
                                {isProblemExpanded ? (
                                  <>Ver menos <ChevronUp className="w-3 h-3" /></>
                                ) : (
                                  <>Ver más <ChevronDown className="w-3 h-3" /></>
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="p-3.5">
                          <StatusBadge status={item.status} />
                        </td>

                        {/* Fecha de entrada */}
                        <td className="p-3.5 font-mono-terminal text-zinc-400">
                          {item.entry_date}
                        </td>

                        {/* Acciones */}
                        <td className="p-3.5 text-center no-print" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openCaseDetails(item)}
                              className="p-1.5 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-500 hover:border-amber-500 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Detalles"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {item.status !== "Entregado" ? (
                              role !== "tecnico" && (
                                <button
                                  onClick={(e) => handleDeliverQuick(item, e)}
                                  className="p-1.5 border border-zinc-800 bg-zinc-950 text-emerald-500 hover:text-white hover:bg-emerald-600 hover:border-emerald-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Entregar equipo y generar conduce"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/conduce?cases=${item.case_code}`, "_blank");
                                }}
                                className="p-1.5 border border-zinc-800 bg-zinc-950 text-amber-500 hover:text-black hover:bg-amber-500 hover:border-amber-500 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Imprimir Conduce de Entrega"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista de Móvil: Lista de Tarjetas */}
            <div className="md:hidden block divide-y divide-zinc-900 bg-zinc-950/20">
              {filteredCases.map((item) => {
                const isImeiExpanded = !!expandedImeis[item.id];
                const isProblemExpanded = !!expandedProblems[item.id];

                return (
                  <div
                    key={item.id}
                    onClick={() => openCaseDetails(item)}
                    className="p-4 hover:bg-zinc-900/60 transition-colors cursor-pointer border-b border-zinc-900 space-y-3"
                  >
                    {/* Fila 1: Código de caso y Fecha */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono-terminal text-amber-500 font-bold tracking-wider text-sm">
                          {item.case_code}
                        </span>
                        <CopyButton text={item.case_code} />
                      </div>
                      <span className="text-[10px] font-mono-terminal text-zinc-500">
                        {item.entry_date}
                      </span>
                    </div>

                    {/* Fila 2: Modelo y Estado */}
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {item.model}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>

                    {/* Fila 3: Cliente e IMEI */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                      <div>
                        <span className="text-[9px] text-zinc-600 font-mono-terminal uppercase block mb-0.5">Cliente</span>
                        <span className="text-zinc-300 font-medium">{item.client_name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-600 font-mono-terminal uppercase block mb-0.5">IMEI</span>
                        <div className="flex items-center gap-1 font-mono-terminal text-zinc-300" onClick={(e) => e.stopPropagation()}>
                          <span
                            onClick={(e) => toggleImei(item.id, e)}
                            className="underline decoration-dotted cursor-pointer hover:text-amber-500"
                          >
                            {isImeiExpanded ? item.imei : `${item.imei.slice(0, 6)}...${item.imei.slice(-4)}`}
                          </span>
                          <CopyButton text={item.imei} />
                        </div>
                      </div>
                    </div>

                    {/* Diagnóstico */}
                    <div className="text-zinc-400 font-mono-terminal text-[11px] bg-zinc-950 border border-zinc-900/50 p-2.5 border-l-2 border-l-amber-500 space-y-1">
                      <span className="text-[9px] text-zinc-600 font-mono-terminal uppercase block">Diagnóstico de Falla</span>
                      <p className="leading-relaxed text-zinc-300">
                        {isProblemExpanded 
                          ? item.problem 
                          : item.problem.length > 50
                            ? `${item.problem.slice(0, 50)}...`
                            : item.problem
                        }
                      </p>
                      {item.problem.length > 50 && (
                        <button
                          onClick={(e) => toggleProblem(item.id, e)}
                          className="text-[9px] text-amber-500 hover:text-amber-400 font-bold transition-all inline-flex items-center gap-0.5 cursor-pointer mt-1"
                        >
                          {isProblemExpanded ? (
                            <>Ver menos <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Ver más <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Fila 4: Acciones */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900/40" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openCaseDetails(item)}
                        className="flex-1 py-1.5 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-500 hover:border-amber-500 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer text-[10px] font-mono-terminal uppercase tracking-wider font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalles</span>
                      </button>

                      {item.status !== "Entregado" ? (
                        role !== "tecnico" && (
                          <button
                            onClick={(e) => handleDeliverQuick(item, e)}
                            className="flex-1 py-1.5 border border-zinc-800 bg-zinc-950 text-emerald-500 hover:text-white hover:bg-emerald-600 hover:border-emerald-600 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer text-[10px] font-mono-terminal uppercase tracking-wider font-bold"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Entregar</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/conduce?cases=${item.case_code}`, "_blank");
                          }}
                          className="flex-1 py-1.5 border border-zinc-800 bg-zinc-950 text-amber-500 hover:text-black hover:bg-amber-500 hover:border-amber-500 transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer text-[10px] font-mono-terminal uppercase tracking-wider font-bold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Conduce</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        )}
      </div>

      {/* Drawer lateral de detalles */}
      <CaseDrawer
        caseData={selectedCase}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onStatusUpdated={handleStatusUpdated}
        onCaseDeleted={handleCaseDeleted}
      />
    </div>
  );
}
