"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { CaseDrawer, WarrantyCase } from "@/components/CaseDrawer";
import { ExportModal } from "@/components/ExportModal";
import { Header } from "@/components/Header";
import { 
  Search, Filter, RotateCw, Eye, Package, Printer, FileText, Download
} from "lucide-react";
import toast from "react-hot-toast";

export default function HistorialEquiposPage() {
  // Data States
  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // UI Interactive States
  const [selectedCase, setSelectedCase] = useState<WarrantyCase | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [expandedImeis, setExpandedImeis] = useState<Record<string, boolean>>({});
  const [expandedProblems, setExpandedProblems] = useState<Record<string, boolean>>({});

  // Cargar registros
  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/warranty");
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

  // Filtrado de casos
  const filteredCases = cases.filter((item) => {
    // Solo mostrar entregados en esta vista
    if (item.status !== "Entregado") return false;

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
  });

  // Estadísticas rápidas
  const totalEntregados = cases.filter((c) => c.status === "Entregado").length;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl w-full mx-auto font-sans-sora">
      
      {/* Header Compartido */}
      <Header />

      {/* Panel de Estadísticas Fijas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="p-4 bg-zinc-900 border border-zinc-850">
          <span className="text-[10px] text-zinc-500 font-mono-terminal uppercase block mb-1">TOTAL HISTORIAL</span>
          <span className="text-2xl font-mono-terminal font-bold text-white">{totalEntregados}</span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-850 border-l-2 border-l-amber-500">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">EQUIPOS ENTREGADOS</span>
          <span className="text-2xl font-mono-terminal font-bold text-amber-500">{totalEntregados}</span>
        </div>
        <div className="p-4 bg-zinc-900 border border-zinc-850 border-l-2 border-l-zinc-650">
          <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">ESTADO DE ARCHIVO</span>
          <span className="text-2xl font-mono-terminal font-bold text-zinc-400">ACTIVO</span>
        </div>
      </div>

      {/* Sección de Filtros */}
      <div className="bg-[#121212] border border-zinc-850 p-4 mb-6">
        <h3 className="text-xs font-mono-terminal font-semibold uppercase tracking-wider text-amber-500 mb-3 flex items-center justify-between border-b border-zinc-900 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros del Historial de Equipos</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-blue-800/60 bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-blue-300 transition-all cursor-pointer text-[10px] tracking-wider font-bold rounded-none"
              title="Exportar registros a CSV/Excel o JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>EXPORTAR</span>
            </button>
            <button
              onClick={fetchCases}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-amber-500 transition-all cursor-pointer text-[10px] tracking-wider font-bold rounded-none"
              title="Sincronizar base de datos"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
              <span>SINCRONIZAR</span>
            </button>
          </div>
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
            <span>No se encontraron equipos entregados en el historial.</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Vista de Escritorio: Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-950/60 font-mono-terminal text-[10px] text-zinc-400 uppercase select-none">
                    <th className="p-3.5 tracking-wider">Código</th>
                    <th className="p-3.5 tracking-wider">Cliente</th>
                    <th className="p-3.5 tracking-wider">IMEI (Equipo)</th>
                    <th className="p-3.5 tracking-wider">Modelo</th>
                    <th className="p-3.5 tracking-wider max-w-[280px]">Diagnóstico de Falla</th>
                    <th className="p-3.5 tracking-wider">Estado</th>
                    <th className="p-3.5 tracking-wider">Fecha Admisión</th>
                    <th className="p-3.5 tracking-wider text-center no-print">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-zinc-950/20">
                  {filteredCases.map((item) => {
                    const isImeiExpanded = !!expandedImeis[item.id];
                    const isProblemExpanded = !!expandedProblems[item.id];

                    return (
                      <tr 
                        key={item.id}
                        onClick={() => openCaseDetails(item)}
                        className="hover:bg-zinc-900/60 transition-colors border-b border-zinc-900 cursor-pointer"
                      >
                        {/* Código de Garantía */}
                        <td className="p-3.5 font-mono-terminal text-amber-500 font-bold tracking-wider">
                          <div className="flex items-center gap-1.5">
                            <span>{item.case_code}</span>
                            <CopyButton text={item.case_code} />
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="p-3.5 text-zinc-200 font-medium">
                          {item.client_name}
                        </td>

                        {/* IMEI */}
                        <td className="p-3.5 font-mono-terminal text-zinc-300">
                          <div className="flex items-center gap-2">
                            <span className="tracking-wider">
                              {isImeiExpanded ? item.imei : `${item.imei.slice(0, 8)}...`}
                            </span>
                            <button
                              onClick={(e) => toggleImei(item.id, e)}
                              className="text-zinc-650 hover:text-amber-500 font-sans-sora text-[9px] hover:underline uppercase tracking-widest cursor-pointer"
                            >
                              {isImeiExpanded ? "[Ver menos]" : "[Expandir]"}
                            </button>
                          </div>
                        </td>

                        {/* Modelo */}
                        <td className="p-3.5 text-zinc-300">
                          {item.model}
                        </td>

                        {/* Diagnóstico */}
                        <td className="p-3.5 max-w-[280px]">
                          <div className="text-zinc-400 font-mono-terminal break-words">
                            <p className="line-clamp-2 leading-relaxed">
                              {isProblemExpanded ? item.problem : (item.problem.length > 70 ? `${item.problem.slice(0, 70)}...` : item.problem)}
                            </p>
                            {item.problem.length > 70 && (
                              <button
                                onClick={(e) => toggleProblem(item.id, e)}
                                className="text-zinc-650 hover:text-amber-500 text-[9px] hover:underline uppercase font-sans-sora mt-1 cursor-pointer block"
                              >
                                {isProblemExpanded ? "Mostrar menos" : "Ver diagnóstico completo"}
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
                              title="Ver Detalles / Editar"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

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

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/receipt?cases=${item.case_code}`, "_blank");
                              }}
                              className="p-1.5 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title="Ver Recibo de Garantía"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
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
                        <span className="text-[9px] text-zinc-650 font-mono-terminal uppercase block mb-0.5">Cliente</span>
                        <span className="text-zinc-300 font-medium">{item.client_name}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-650 font-mono-terminal uppercase block mb-0.5">IMEI</span>
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
                      <span className="text-[9px] text-zinc-650 font-mono-terminal uppercase block">Diagnóstico de Falla</span>
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
                          {isProblemExpanded ? "Mostrar menos" : "Ver diagnóstico completo"}
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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/receipt?cases=${item.case_code}`, "_blank");
                        }}
                        className="flex-1 py-1.5 border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer text-[10px] font-mono-terminal uppercase tracking-wider font-bold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Recibo</span>
                      </button>
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

      {/* Modal de Exportación */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredCases={filteredCases}
        allCases={cases}
      />
    </div>
  );
}
