"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { CaseDrawer, WarrantyCase } from "@/components/CaseDrawer";
import { ExportModal } from "@/components/ExportModal";
import { Header } from "@/components/Header";
import { 
  Search, Filter, RotateCw, Eye, ChevronDown, ChevronUp, Package, Printer, Check, AlertTriangle, Clock, Download
} from "lucide-react";
import toast from "react-hot-toast";
import { getTodayDateStr } from "@/lib/tz-utils";

// Helper function to calculate exact days elapsed
const getDaysDifference = (entryDateStr: string, todayDateStr: string): number => {
  if (!entryDateStr || !todayDateStr) return 0;
  const entryDate = new Date(entryDateStr + "T00:00:00");
  const todayDate = new Date(todayDateStr + "T00:00:00");
  const diffTime = todayDate.getTime() - entryDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

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
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showOlderThan30, setShowOlderThan30] = useState(false);

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
  const todayStr = getTodayDateStr();

  const filteredCases = cases
    .filter((item) => {
      // Filtro de equipos con más de 30 días (Crédito)
      if (showOlderThan30) {
        const daysDiff = getDaysDifference(item.entry_date, todayStr);
        if (item.status === "Entregado" || item.status === "Nota de crédito" || daysDiff < 30) return false;
      }

      // Si hay un estado seleccionado por filtro, filtramos por él (incluyendo "Entregado").
      // Si no hay ninguno seleccionado, mostramos solo los pendientes (excluyendo "Entregado" y "Nota de crédito").
      if (selectedStatus) {
        if (item.status !== selectedStatus) return false;
      } else {
        if (item.status === "Entregado" || item.status === "Nota de crédito") return false;
      }

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
    notaCredito: cases.filter((c) => c.status === "Nota de crédito").length,
    olderThan30: cases.filter((c) => c.status !== "Entregado" && c.status !== "Nota de crédito" && getDaysDifference(c.entry_date, todayStr) >= 30).length,
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl w-full mx-auto font-sans-sora">
      
      {/* Header Compartido */}
      <Header />

      {/* Alerta de Nota de Crédito (+30 días) */}
      {stats.olderThan30 > 0 && (
        <div className="mb-6 bg-red-950/20 border border-red-900/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_0_15px_rgba(239,68,68,0.05)] border-l-4 border-l-red-500">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono-terminal flex items-center gap-1.5">
                <span>Alerta de Nota de Crédito</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              </h4>
              <p className="text-[11px] text-zinc-400 font-sans-sora mt-0.5 leading-relaxed">
                Hay <span className="font-bold text-white font-mono-terminal">{stats.olderThan30}</span> {stats.olderThan30 === 1 ? "equipo" : "equipos"} con más de 30 días sin entregar en el taller. Es prioritario resolverlos para evitar notas de crédito.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOlderThan30(!showOlderThan30)}
            className={`px-4 py-2 border font-mono-terminal font-bold text-[10px] tracking-wider transition-all cursor-pointer uppercase shrink-0 self-start sm:self-center select-none ${
              showOlderThan30
                ? "bg-red-500 border-red-600 text-black hover:bg-red-400"
                : "bg-red-950/40 border-red-500/50 text-red-400 hover:bg-red-900/60"
            }`}
          >
            {showOlderThan30 ? "Ver Todos los Equipos" : "Ver Equipos Retenidos"}
          </button>
        </div>
      )}

      {/* Panel de Estadísticas Fijas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {/* Recibidos */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === "Recibido" ? null : "Recibido")}
          className={`p-4 transition-all duration-200 cursor-pointer select-none border border-zinc-850 border-l-2 hover:scale-[1.02] active:scale-[0.98] ${
            selectedStatus === "Recibido"
              ? "bg-teal-950/30 border-teal-500/70 border-l-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]"
              : "bg-zinc-900 hover:bg-zinc-850 border-l-teal-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Recibidos (Nuevos)</span>
            {selectedStatus === "Recibido" && <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>}
          </div>
          <span className="text-xl font-mono-terminal font-bold text-teal-400">{stats.recibido}</span>
        </div>

        {/* En Taller */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === "En reparación" ? null : "En reparación")}
          className={`p-4 transition-all duration-200 cursor-pointer select-none border border-zinc-850 border-l-2 hover:scale-[1.02] active:scale-[0.98] ${
            selectedStatus === "En reparación"
              ? "bg-amber-950/30 border-amber-500/70 border-l-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
              : "bg-zinc-900 hover:bg-zinc-850 border-l-amber-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">En Taller (Téc)</span>
            {selectedStatus === "En reparación" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
          </div>
          <span className="text-xl font-mono-terminal font-bold text-amber-500">{stats.reparacion}</span>
        </div>

        {/* Recibidos de Téc */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === "Recibido del técnico" ? null : "Recibido del técnico")}
          className={`p-4 transition-all duration-200 cursor-pointer select-none border border-zinc-850 border-l-2 hover:scale-[1.02] active:scale-[0.98] ${
            selectedStatus === "Recibido del técnico"
              ? "bg-emerald-950/30 border-emerald-500/70 border-l-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              : "bg-zinc-900 hover:bg-zinc-850 border-l-emerald-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Recibidos de Téc</span>
            {selectedStatus === "Recibido del técnico" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
          </div>
          <span className="text-xl font-mono-terminal font-bold text-emerald-400">{stats.recibidoTecnico}</span>
        </div>

        {/* En Marca (Suplidor) */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === "Enviado al suplidor" ? null : "Enviado al suplidor")}
          className={`p-4 transition-all duration-200 cursor-pointer select-none border border-zinc-850 border-l-2 hover:scale-[1.02] active:scale-[0.98] ${
            selectedStatus === "Enviado al suplidor"
              ? "bg-blue-950/30 border-blue-500/70 border-l-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              : "bg-zinc-900 hover:bg-zinc-850 border-l-blue-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">En Marca (Suplidor)</span>
            {selectedStatus === "Enviado al suplidor" && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
          </div>
          <span className="text-xl font-mono-terminal font-bold text-blue-500">{stats.enSuplidor}</span>
        </div>

        {/* Recibidos de Marca */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === "Recibido del suplidor" ? null : "Recibido del suplidor")}
          className={`p-4 transition-all duration-200 cursor-pointer select-none border border-zinc-850 border-l-2 hover:scale-[1.02] active:scale-[0.98] ${
            selectedStatus === "Recibido del suplidor"
              ? "bg-purple-950/30 border-purple-500/70 border-l-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              : "bg-zinc-900 hover:bg-zinc-850 border-l-purple-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Recibidos de Marca</span>
            {selectedStatus === "Recibido del suplidor" && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>}
          </div>
          <span className="text-xl font-mono-terminal font-bold text-purple-500">{stats.recibidoSuplidor}</span>
        </div>

        {/* Nota de Crédito */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === "Nota de crédito" ? null : "Nota de crédito")}
          className={`p-4 transition-all duration-200 cursor-pointer select-none border border-zinc-850 border-l-2 hover:scale-[1.02] active:scale-[0.98] ${
            selectedStatus === "Nota de crédito"
              ? "bg-rose-950/30 border-rose-500/70 border-l-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              : "bg-zinc-900 hover:bg-zinc-850 border-l-rose-500"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Nota de Crédito</span>
            {selectedStatus === "Nota de crédito" && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>}
          </div>
          <span className="text-xl font-mono-terminal font-bold text-rose-500">{stats.notaCredito}</span>
        </div>

        {/* Entregados Clientes */}
        <div 
          onClick={() => setSelectedStatus(selectedStatus === "Entregado" ? null : "Entregado")}
          className={`p-4 transition-all duration-200 cursor-pointer select-none border border-zinc-850 border-l-2 hover:scale-[1.02] active:scale-[0.98] ${
            selectedStatus === "Entregado"
              ? "bg-zinc-800 border-zinc-650 border-l-zinc-400 shadow-[0_0_15px_rgba(228,228,231,0.15)]"
              : "bg-[#161616] hover:bg-zinc-900 border-l-zinc-650"
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-zinc-400 font-mono-terminal uppercase block mb-1">Entregados Clientes</span>
            {selectedStatus === "Entregado" && <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse"></span>}
          </div>
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Filtrar por Estado */}
          <div>
            <label className="text-[10px] font-mono-terminal text-zinc-500 uppercase block mb-1">Estado</label>
            <select
              value={selectedStatus || ""}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="">Todos los pendientes</option>
              <option value="Recibido">Recibido (Nuevo)</option>
              <option value="En reparación">En Taller (Téc)</option>
              <option value="Recibido del técnico">Recibido de Téc</option>
              <option value="Enviado al suplidor">En Marca (Suplidor)</option>
              <option value="Recibido del suplidor">Recibidos de Marca</option>
              <option value="Entregado">Entregados Clientes</option>
              <option value="Nota de crédito">Notas de Crédito</option>
            </select>
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

        {/* Reset de Filtros y Toggles */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 pt-3.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOlderThan30(!showOlderThan30)}
              className={`px-3 py-1.5 text-[10px] font-mono-terminal transition-all cursor-pointer border uppercase rounded-none flex items-center gap-1.5 select-none ${
                showOlderThan30
                  ? "bg-red-950/40 border-red-500/70 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                  : "bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${showOlderThan30 ? "text-red-500 animate-pulse" : "text-zinc-500"}`} />
              <span>Equipos +30 Días ({stats.olderThan30})</span>
            </button>
          </div>
          
          {(searchQuery || dateFrom || dateTo || selectedStatus || showOlderThan30) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
                setSelectedStatus(null);
                setShowOlderThan30(false);
              }}
              className="px-3 py-1.5 text-[10px] font-mono-terminal bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800 uppercase rounded-none select-none"
            >
              Limpiar filtros
            </button>
          )}
        </div>
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
                    const daysDiff = getDaysDifference(item.entry_date, todayStr);
                    const isPendingAndOlder = item.status !== "Entregado" && daysDiff >= 30;
                    
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
                          <div className="flex flex-col gap-0.5">
                            <span>{item.entry_date}</span>
                            <span className={`text-[9px] flex items-center gap-0.5 ${
                              isPendingAndOlder 
                                ? "text-red-400 font-bold" 
                                : "text-zinc-500"
                            }`}>
                              {isPendingAndOlder && <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />}
                              <span>{daysDiff} {daysDiff === 1 ? "día" : "días"}</span>
                            </span>
                          </div>
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
                const daysDiff = getDaysDifference(item.entry_date, todayStr);
                const isPendingAndOlder = item.status !== "Entregado" && daysDiff >= 30;

                return (
                  <div
                    key={item.id}
                    onClick={() => openCaseDetails(item)}
                    className="p-4 hover:bg-zinc-900/60 transition-colors cursor-pointer border-b border-zinc-900 space-y-3"
                  >
                    {/* Fila 1: Código de caso y Fecha */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono-terminal text-amber-500 font-bold tracking-wider text-sm">
                          {item.case_code}
                        </span>
                        <CopyButton text={item.case_code} />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono-terminal text-zinc-400">
                          {item.entry_date}
                        </span>
                        <span className={`text-[9px] font-mono-terminal flex items-center gap-0.5 mt-0.5 ${
                          isPendingAndOlder ? "text-red-400 font-bold" : "text-zinc-500"
                        }`}>
                          {isPendingAndOlder && <AlertTriangle className="w-2.5 h-2.5 text-red-500 shrink-0" />}
                          <span>{daysDiff} {daysDiff === 1 ? "día" : "días"}</span>
                        </span>
                      </div>
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
