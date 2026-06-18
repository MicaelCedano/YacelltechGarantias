import React from "react";
import { isMockMode, supabase } from "@/lib/supabase";
import { getMockCases, WarrantyCase } from "@/lib/mockDb";
import { notFound } from "next/navigation";
import { User, Calendar, ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { PrintActions } from "@/components/PrintActions";
import { formatDateSDLong } from "@/lib/tz-utils";

interface ReceiptPageProps {
  searchParams: {
    cases?: string;
  };
}

export default async function ReceiptPage({ searchParams }: ReceiptPageProps) {
  const casesQuery = searchParams.cases || "";
  const caseCodes = casesQuery
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (caseCodes.length === 0) {
    notFound();
  }

  // Obtener los datos de los casos (Modo Local o Supabase remoto)
  let items: WarrantyCase[] = [];
  if (isMockMode()) {
    const allMock = await getMockCases();
    items = allMock.filter((c) => caseCodes.includes(c.case_code.toUpperCase()));
  } else {
    const { data, error } = await supabase
      .from("warranty_cases")
      .select("*")
      .in("case_code", caseCodes);
    if (!error && data) {
      items = data;
    }
  }

  if (items.length === 0) {
    notFound();
  }

  // Ordenar según los query params
  items.sort((a, b) => caseCodes.indexOf(a.case_code.toUpperCase()) - caseCodes.indexOf(b.case_code.toUpperCase()));

  // Cliente común
  const clientName = items[0].client_name;

  // Fecha de ingreso formateada en zona horaria de Santo Domingo
  const getEntryDateFormatted = () => {
    // Tomamos la fecha del primer equipo ingresado
    const entryDateStr = items[0].entry_date;
    try {
      const dateParts = entryDateStr.split("-");
      if (dateParts.length === 3) {
        // Construir Date asumiendo UTC y luego formatear en zona SD
        const dateObj = new Date(Date.UTC(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2])
        ));
        return formatDateSDLong(dateObj);
      }
    } catch (e) {
      console.error(e);
    }
    return entryDateStr;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f3f4f6] font-sans-sora flex flex-col items-center p-4 md:p-8 w-full print:bg-white print:text-black">
      
      {/* Botones de Navegación (Solo pantalla) */}
      <div className="w-full max-w-3xl no-print flex justify-between items-center mb-6">
        <Link
          href="/dashboard"
          className="text-xs font-mono-terminal text-zinc-400 hover:text-amber-500 uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </Link>
        <span className="text-[10px] text-zinc-600 font-mono-terminal uppercase tracking-widest flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          <span>Señal Digital - INGRESO DE EQUIPOS</span>
        </span>
      </div>

      {/* Documento Recibo / Conduce de Recepción */}
      <main className="w-full max-w-3xl bg-white text-black border border-zinc-300 p-8 md:p-12 shadow-2xl relative print:shadow-none print:p-0 print:border-none print:w-full print:max-w-full">
        
        {/* Cabecera del Conduce */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-6 border-b-2 border-black pb-6 mb-6">
          <div className="flex flex-col items-center sm:items-start">
            {/* Logo de Sena Digital */}
            <img 
              src="/logo-sena.png" 
              alt="Sena Digital Logo" 
              className="h-16 w-auto object-contain mb-2 print:h-20"
            />
            <h1 className="text-xl font-bold font-mono-terminal tracking-wider text-[#e30613]">
              Señal Digital
            </h1>
            <p className="text-[10px] text-zinc-600 font-mono-terminal uppercase tracking-wider">
              Servicio Técnico y Distribución de Dispositivos
            </p>
          </div>

          <div className="text-center sm:text-right flex flex-col gap-1">
            <span className="text-xs font-bold bg-black text-white px-3 py-1 font-mono-terminal tracking-wider inline-block uppercase select-none print:border print:border-black">
              CONDUCE DE RECEPCIÓN
            </span>
          </div>
        </div>

        {/* Detalles del Ingreso */}
        <div className="mb-6">
          <h3 className="text-xs font-mono-terminal font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-400 pb-1 mb-3">
            Datos del Propietario
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-500" />
              <div>
                <span className="text-zinc-500 uppercase text-[9px] block">Nombre del Cliente</span>
                <span className="font-bold text-zinc-900">{clientName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <div>
                <span className="text-zinc-500 uppercase text-[9px] block">Fecha de Admisión</span>
                <span className="font-bold text-zinc-900">{getEntryDateFormatted()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detalle de los Equipos Recibidos */}
        <div className="mb-8">
          <h3 className="text-base font-mono-terminal font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-400 pb-1 mb-3">
            Equipos Ingresados a Garantía ({items.length})
          </h3>
          
          <table className="w-full text-left border-collapse text-xs border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300 uppercase font-mono-terminal tracking-wider text-[10px] text-zinc-700 font-bold select-none">
                <th className="p-2 border-r border-zinc-300 w-1/3">Modelo</th>
                <th className="p-2 border-r border-zinc-300 w-1/3">IMEI</th>
                <th className="p-2 w-1/3">Falla Reportada / Diagnóstico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300">
              {items.map((item) => (
                <tr key={item.id} className="text-zinc-900 hover:bg-zinc-55/10">
                  <td className="p-1.5 border-r border-zinc-300 font-semibold">{item.model}</td>
                  <td className="p-1.5 border-r border-zinc-300 font-mono-terminal tracking-wider">{item.imei}</td>
                  <td className="p-1.5 font-mono-terminal italic bg-zinc-50/50 text-[10px] leading-snug">{item.problem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Políticas de garantía */}
        <div className="mb-10 p-4 border border-zinc-300 bg-zinc-50 text-sm leading-relaxed text-zinc-800">
          <h4 className="font-bold text-zinc-900 mb-1.5 uppercase font-mono-terminal text-base">Políticas de Garantía y Recepción</h4>
          <ul className="list-disc list-inside space-y-1 lowercase text-sm leading-relaxed">
            <li>El dispositivo debe ser presentado con este conduce de recepción.</li>
            <li>La garantía cubre únicamente fallos de fábrica descritos arriba.</li>
            <li>Excluye daños por humedad, golpes o intervención de terceros.</li>
            <li>Plazo máximo de retiro: 30 días posteriores al aviso de finalización de servicio.</li>
          </ul>
        </div>

        {/* Bloque de Firmas */}
        <div className="grid grid-cols-2 gap-12 mt-12 mb-6 pt-4 text-xs font-mono-terminal uppercase">
          
          {/* Firma Entregado por Cliente */}
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-zinc-400 mt-10 mb-2"></div>
            <span className="font-bold text-zinc-900">Entregado Conforme (Cliente)</span>
          </div>

          {/* Firma Recibido por Técnico */}
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-zinc-400 mt-10 mb-2"></div>
            <span className="font-bold text-zinc-900">Recibido Por (Taller)</span>
            <span className="text-[10px] text-zinc-500 mt-1">Firma del Técnico Receptor</span>
          </div>
        </div>

        {/* Acciones de Impresión / Cierre */}
        <PrintActions printLabel="Imprimir Conduce de Recepción" />
      </main>
    </div>
  );
}
