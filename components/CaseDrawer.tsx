"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, User, Smartphone, FileText, ExternalLink, RefreshCw } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { CopyButton } from "./CopyButton";
import Link from "next/link";
import toast from "react-hot-toast";

export interface WarrantyCase {
  id: string;
  case_code: string;
  imei: string;
  model: string;
  client_name: string;
  problem: string;
  status: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

interface CaseDrawerProps {
  caseData: WarrantyCase | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: (updatedCase: WarrantyCase) => void;
  onCaseDeleted?: (caseCode: string) => void;
}

export function CaseDrawer({ caseData, isOpen, onClose, onStatusUpdated, onCaseDeleted }: CaseDrawerProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // States for editing fields
  const [editClientName, setEditClientName] = useState<string>("");
  const [editModel, setEditModel] = useState<string>("");
  const [editImei, setEditImei] = useState<string>("");
  const [editProblem, setEditProblem] = useState<string>("");

  useEffect(() => {
    if (caseData) {
      setSelectedStatus(caseData.status);
      setEditClientName(caseData.client_name);
      setEditModel(caseData.model);
      setEditImei(caseData.imei);
      setEditProblem(caseData.problem);
    }
    setIsEditing(false);
  }, [caseData]);

  if (!isOpen || !caseData) return null;

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/warranty/${caseData.case_code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.ok ? await response.json() : null;

      if (!result || !result.success) {
        throw new Error(result?.error || "Error al actualizar estado");
      }

      toast.success(`Estado actualizado a: ${newStatus}`);
      onStatusUpdated(result.case);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Fallo al conectar con el servidor para actualizar el estado";
      toast.error(message);
      setSelectedStatus(caseData.status); // restaurar anterior
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editClientName.trim()) {
      toast.error("El nombre del cliente no puede estar vacío.");
      return;
    }
    if (!editModel.trim()) {
      toast.error("El modelo no puede estar vacío.");
      return;
    }
    if (editImei && (editImei.length !== 15 || !/^\d+$/.test(editImei))) {
      toast.error("El IMEI debe contener exactamente 15 dígitos numéricos.");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/warranty/${caseData.case_code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: editClientName,
          model: editModel,
          imei: editImei,
          problem: editProblem,
        }),
      });

      const result = await response.ok ? await response.json() : null;

      if (!result || !result.success) {
        throw new Error(result?.error || "Error al actualizar la garantía");
      }

      toast.success("Garantía actualizada con éxito");
      onStatusUpdated(result.case);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Fallo al guardar los cambios.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCase = async () => {
    const confirmDelete = window.confirm(
      `¿Está absolutamente seguro de eliminar la garantía ${caseData.case_code} del sistema?\nEsta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/warranty/${caseData.case_code}`, {
        method: "DELETE",
      });

      const result = await response.ok ? await response.json() : null;

      if (!result || !result.success) {
        throw new Error(result?.error || "Error al eliminar la garantía");
      }

      toast.success("Garantía eliminada con éxito");
      if (onCaseDeleted) {
        onCaseDeleted(caseData.case_code);
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Fallo al eliminar la garantía.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeliverAndPrint = async () => {
    // Abrir una pestaña en blanco de forma síncrona antes del await para evadir el bloqueador de popups del navegador
    const conduceTab = window.open("about:blank", "_blank");

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/warranty/${caseData.case_code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Entregado" }),
      });

      const result = await response.ok ? await response.json() : null;

      if (!result || !result.success) {
        if (conduceTab) conduceTab.close();
        throw new Error(result?.error || "Error al actualizar estado");
      }

      // Registrar el conduce en el historial
      try {
        await fetch("/api/conduces", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_name: caseData.client_name,
            case_codes: [caseData.case_code],
          }),
        });
      } catch (logErr) {
        console.error("No se pudo registrar el conduce en el historial:", logErr);
      }

      toast.success("Equipo entregado. Generando conduce...");
      onStatusUpdated(result.case);
      
      // Redirigir la pestaña previamente abierta al conduce
      if (conduceTab) {
        conduceTab.location.href = `/conduce?cases=${caseData.case_code}`;
      } else {
        window.open(`/conduce?cases=${caseData.case_code}`, "_blank");
      }
    } catch (err) {
      if (conduceTab) conduceTab.close();
      console.error(err);
      const message = err instanceof Error ? err.message : "Fallo al realizar la entrega";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Backdrop de desenfoque oscuro */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel Deslizable Lateral */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-[#121212] border-l border-zinc-800 z-50 shadow-2xl flex flex-col font-sans-sora transition-transform duration-300">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-[#161616]">
          <div>
            <span className="text-[10px] tracking-wider text-amber-500 font-mono-terminal block uppercase mb-1">
              Terminal de Control
            </span>
            <h2 className="text-lg font-mono-terminal font-bold text-white flex items-center gap-2">
              {caseData.case_code}
              <CopyButton text={caseData.case_code} />
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 text-[10px] tracking-wider font-mono-terminal uppercase border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-500 hover:border-amber-500 transition-all cursor-pointer rounded-none"
              >
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white border border-zinc-850 hover:border-zinc-700 bg-zinc-950 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Detalle */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Sección de Cambio de Estado Rápido (Solo visible si no se está editando campos generales) */}
          {!isEditing && (
            <div className="p-4 bg-zinc-900 border border-zinc-850">
              <label className="text-[10px] tracking-wider text-zinc-400 font-mono-terminal block uppercase mb-2">
                Estado de la Reparación
              </label>
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={selectedStatus} />
                
                <div className="relative flex items-center">
                  <select
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    disabled={isUpdating}
                    className="px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-850 text-zinc-300 font-mono-terminal uppercase rounded-none focus:border-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pr-7"
                  >
                    <option value="En reparación">En reparación</option>
                    <option value="Enviado al suplidor">Enviado al suplidor</option>
                    <option value="Recibido del suplidor">Recibido del suplidor</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                  {isUpdating && (
                    <span className="absolute right-2 pointer-events-none">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Información del Dispositivo */}
          <div className="space-y-4">
            
            {/* IMEI */}
            <div className="pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="uppercase text-[10px] tracking-wider">IMEI</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={15}
                  value={editImei}
                  onChange={(e) => setEditImei(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none focus:border-amber-500 focus:outline-hidden"
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-mono-terminal text-sm font-semibold tracking-wider text-zinc-200">
                    {caseData.imei}
                  </span>
                  <CopyButton text={caseData.imei} />
                </div>
              )}
            </div>

            {/* Modelo */}
            <div className="pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="uppercase text-[10px] tracking-wider">Modelo</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 focus:outline-hidden"
                />
              ) : (
                <span className="text-sm text-zinc-100 font-medium">{caseData.model}</span>
              )}
            </div>

            {/* Cliente */}
            <div className="pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="uppercase text-[10px] tracking-wider">Cliente</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 text-white rounded-none focus:border-amber-500 focus:outline-hidden"
                />
              ) : (
                <span className="text-sm text-zinc-100 font-medium">{caseData.client_name}</span>
              )}
            </div>

            {/* Fecha Ingreso */}
            <div className="pb-3 border-b border-zinc-900">
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="uppercase text-[10px] tracking-wider">Fecha de Admisión</span>
              </div>
              <span className="text-sm text-zinc-200 font-mono-terminal">{caseData.entry_date}</span>
            </div>

            {/* Problema */}
            <div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span className="uppercase text-[10px] tracking-wider">Diagnóstico de Falla</span>
              </div>
              {isEditing ? (
                <textarea
                  rows={4}
                  value={editProblem}
                  onChange={(e) => setEditProblem(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 text-white font-mono-terminal rounded-none focus:border-amber-500 focus:outline-hidden"
                />
              ) : (
                <div className="p-3 bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 font-mono-terminal whitespace-pre-wrap leading-relaxed border-l-2 border-l-amber-500">
                  {caseData.problem}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie de Página */}
        <div className="p-4 border-t border-zinc-800 bg-[#161616] flex flex-col gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveChanges}
                disabled={isUpdating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-black font-bold text-xs font-mono-terminal uppercase transition-all tracking-wider text-center cursor-pointer rounded-none"
              >
                {isUpdating ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditClientName(caseData.client_name);
                  setEditModel(caseData.model);
                  setEditImei(caseData.imei);
                  setEditProblem(caseData.problem);
                }}
                disabled={isUpdating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white text-xs font-mono-terminal uppercase transition-all tracking-wider text-center cursor-pointer rounded-none"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/receipt?cases=${caseData.case_code}`}
                target="_blank"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white text-xs font-mono-terminal uppercase transition-all tracking-wider text-center cursor-pointer"
              >
                <span>Ver Recibo de Garantía</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              
              {caseData.status === "Entregado" ? (
                <Link
                  href={`/conduce?cases=${caseData.case_code}`}
                  target="_blank"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs font-mono-terminal uppercase transition-all tracking-wider text-center cursor-pointer"
                >
                  <span>Imprimir Conduce de Entrega</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <button
                  onClick={handleDeliverAndPrint}
                  disabled={isUpdating}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-xs font-mono-terminal uppercase transition-all tracking-wider text-center cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Entregar y Generar Conduce</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleDeleteCase}
                disabled={isUpdating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-red-950/20 hover:bg-[#e30613] border border-[#e30613]/30 hover:border-[#e30613] text-[#e30613] hover:text-white text-xs font-mono-terminal uppercase transition-all tracking-wider text-center cursor-pointer rounded-none"
              >
                Eliminar Garantía
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
