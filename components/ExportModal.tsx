"use client";

import React, { useState } from "react";
import { X, Download, FileSpreadsheet, FileCode, Filter, Database, Check } from "lucide-react";
import toast from "react-hot-toast";
import { WarrantyCase } from "./CaseDrawer";
import { exportWarrantiesToCSV, exportWarrantiesToJSON } from "@/lib/exportUtils";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredCases: WarrantyCase[];
  allCases: WarrantyCase[];
}

export function ExportModal({ isOpen, onClose, filteredCases, allCases }: ExportModalProps) {
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const targetCases = scope === "filtered" ? filteredCases : allCases;

  const handleExport = () => {
    if (targetCases.length === 0) {
      toast.error("No hay registros disponibles para exportar con la selección actual.");
      return;
    }

    setIsExporting(true);
    try {
      if (format === "csv") {
        exportWarrantiesToCSV(targetCases, scope === "filtered" ? "Garantias_Filtradas" : "Garantias_Todas");
        toast.success(`Se exportaron ${targetCases.length} registros en formato CSV (Excel).`);
      } else {
        exportWarrantiesToJSON(targetCases, scope === "filtered" ? "Garantias_Filtradas" : "Garantias_Todas");
        toast.success(`Se exportaron ${targetCases.length} registros en formato JSON.`);
      }
      onClose();
    } catch (err) {
      console.error("Error exportando datos:", err);
      toast.error("Hubo un problema al exportar los datos.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Exportar Registros de Garantía</h3>
              <p className="text-xs text-slate-500">Descarga los datos sin acceder a SQL para pasarlos a otro sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Alcance de datos */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              1. Selecciona los datos a exportar
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope("filtered")}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  scope === "filtered"
                    ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span>Vista Filtrada</span>
                  </div>
                  {scope === "filtered" && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="text-xs text-slate-500 font-normal">
                  {filteredCases.length} registro(s) según tus filtros actuales
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScope("all")}
                className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  scope === "all"
                    ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Todos los Casos</span>
                  </div>
                  {scope === "all" && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="text-xs text-slate-500 font-normal">
                  {allCases.length} registro(s) totales en la base de datos
                </span>
              </button>
            </div>
          </div>

          {/* Formato de archivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              2. Selecciona el formato de salida
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  format === "csv"
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-sm">CSV (Excel)</div>
                  <div className="text-[11px] text-slate-500">Para hojas de cálculo</div>
                </div>
                {format === "csv" && <Check className="w-4 h-4 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  format === "json"
                    ? "border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 text-sm">JSON</div>
                  <div className="text-[11px] text-slate-500">Para desarrollo / API</div>
                </div>
                {format === "json" && <Check className="w-4 h-4 text-purple-600" />}
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Se descargará:</span>
            <span className="font-semibold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              {targetCases.length} registro(s) en formato .{format.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || targetCases.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Archivo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
