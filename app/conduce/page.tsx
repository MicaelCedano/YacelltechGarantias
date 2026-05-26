import React from "react";
import { isMockMode, supabase } from "@/lib/supabase";
import { getMockCases, WarrantyCase } from "@/lib/mockDb";
import { notFound } from "next/navigation";
import { User, Calendar, ShieldCheck, ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { PrintActions } from "@/components/PrintActions";

interface ConducePageProps {
  searchParams: {
    cases?: string;
    type?: string;
    suplidor?: string;
    tecnico?: string;
  };
}

export default async function ConducePage({ searchParams }: ConducePageProps) {
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

  // Ordenar los registros según el orden exacto especificado en los query params
  items.sort((a, b) => caseCodes.indexOf(a.case_code.toUpperCase()) - caseCodes.indexOf(b.case_code.toUpperCase()));

  // Cliente común del despacho (primero de la lista)
  const clientName = items[0].client_name;
  
  // Determinar si es un conduce de suplidor o de técnico
  const isSupplier = searchParams.type === "suplidor";
  const isTech = searchParams.type === "tecnico";
  const targetName = searchParams.suplidor || searchParams.tecnico || clientName;

  // Fecha de entrega local formateada (Hoy)
  const getTodayFormatted = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString("es-ES", options);
  };

  // Títulos dinámicos de sección
  let moduleTitle = "DESPACHO DE EQUIPOS";
  if (isSupplier) moduleTitle = "ENVÍO A LA MARCA";
  else if (isTech) moduleTitle = "ASIGNACIÓN A TÉCNICO";

  let docTitle = "CONDUCE DE ENTREGA";
  if (isSupplier) docTitle = "CONDUCE DE ENVÍO A LA MARCA";
  else if (isTech) docTitle = "CONDUCE DE ASIGNACIÓN A TÉCNICO";

  let detailTitle = "Datos del Receptor";
  if (isSupplier) detailTitle = "Datos de la Marca / Suplidor";
  else if (isTech) detailTitle = "Datos del Técnico";

  let userLabel = "Cliente";
  if (isSupplier) userLabel = "Marca / Proveedor";
  else if (isTech) userLabel = "Técnico Asignado";

  let dateLabel = "Fecha de Entrega";
  if (isSupplier) dateLabel = "Fecha de Envío";
  else if (isTech) dateLabel = "Fecha de Asignación";

  let tableSubtitle = `Detalle de Equipos Entregados (${items.length})`;
  if (isSupplier) tableSubtitle = `Detalle de Equipos Enviados (${items.length})`;
  else if (isTech) tableSubtitle = `Detalle de Equipos Asignados (${items.length})`;

  let policyText = (
    <>
      <strong>CONFORMIDAD DE RECEPCIÓN:</strong> Por medio de la firma de este conduce, el cliente certifica que recibe los equipos arriba descritos a su entera satisfacción, debidamente reparados, probados y funcionando bajo las condiciones de garantía especificadas.
    </>
  );
  let policyColor = "text-emerald-600";
  if (isSupplier) {
    policyText = (
      <>
        <strong>ENVÍO A SOPORTE TÉCNICO:</strong> Se hace constar que los dispositivos detallados en este conduce son enviados a soporte técnico oficial de la marca para su debida revisión y reparación bajo los términos de garantía.
      </>
    );
    policyColor = "text-blue-600";
  } else if (isTech) {
    policyText = (
      <>
        <strong>ASIGNACIÓN INTERNA DE REPARACIÓN:</strong> Se hace constar que los dispositivos descritos son asignados internamente al técnico de taller para su respectiva reparación física de hardware y/o software en nuestras instalaciones.
      </>
    );
    policyColor = "text-amber-500";
  }

  let signatureLeft = "Recibido Conforme (Cliente)";
  if (isSupplier) signatureLeft = "Recibido por (Marca / Suplidor)";
  else if (isTech) signatureLeft = "Recibido por (Técnico Asignado)";

  let signatureRight = "Entregado Por (Taller)";
  if (isTech) signatureRight = "Asignado Por (Supervisor)";

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
        <span className="text-[10px] text-zinc-650 font-mono-terminal uppercase tracking-widest flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          <span>Señal Digital - {moduleTitle}</span>
        </span>
      </div>

      {/* Documento Conduce de Entrega */}
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
            <p className="text-[10px] text-zinc-650 font-mono-terminal uppercase tracking-wider">
              Servicio Técnico y Distribución de Dispositivos
            </p>
          </div>

          <div className="text-center sm:text-right flex flex-col gap-1">
            <span className="text-xs font-bold bg-black text-white px-3 py-1 font-mono-terminal tracking-wider inline-block uppercase select-none print:border print:border-black">
              {docTitle}
            </span>
            <span className="text-[10px] font-mono-terminal text-zinc-700 font-semibold mt-1">
              RNC: 132-45678-9 (Temp)
            </span>
          </div>
        </div>

        {/* Detalles de la Entrega */}
        <div className="mb-6">
          <h3 className="text-xs font-mono-terminal font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-400 pb-1 mb-3">
            {detailTitle}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-550" />
              <div>
                <span className="text-zinc-500 uppercase text-[9px] block">{userLabel}</span>
                <span className="font-bold text-zinc-900">{targetName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <div>
                <span className="text-zinc-500 uppercase text-[9px] block">{dateLabel}</span>
                <span className="font-bold text-zinc-900">{getTodayFormatted()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detalle de los Equipos Entregados */}
        <div className="mb-8">
          <h3 className="text-xs font-mono-terminal font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-400 pb-1 mb-3">
            {tableSubtitle}
          </h3>
          
          <table className="w-full text-left border-collapse text-xs border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300 uppercase font-mono-terminal tracking-wider text-[10px] text-zinc-700 font-bold select-none">
                <th className="p-2 border-r border-zinc-300 w-1/3">Modelo</th>
                <th className="p-2 border-r border-zinc-300 w-1/3">IMEI</th>
                <th className="p-2 w-1/3">{isSupplier ? "Falla Diagnosticada" : "Trabajos Realizados / Diagnóstico"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-300">
              {items.map((item) => (
                <tr key={item.id} className="text-zinc-900 hover:bg-zinc-50/10">
                  <td className="p-2 border-r border-zinc-300 font-semibold">{item.model}</td>
                  <td className="p-2 border-r border-zinc-300 font-mono-terminal tracking-wider">{item.imei}</td>
                  <td className="p-2 font-mono-terminal italic bg-zinc-50/50 text-[11px] leading-tight">{item.problem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Declaración de conformidad */}
        <div className="mb-10 p-4 border border-zinc-300 bg-zinc-50 text-[11px] leading-relaxed text-zinc-800">
          <div className="flex gap-2.5 items-start">
            <ShieldCheck className={`w-5 h-5 ${policyColor} shrink-0 mt-0.5`} />
            <p>
              {policyText}
            </p>
          </div>
        </div>

        {/* Bloque de Firmas */}
        <div className="grid grid-cols-2 gap-12 mt-12 mb-6 pt-4 text-xs font-mono-terminal uppercase">
          
          {/* Firma Cliente / Suplidor / Tecnico */}
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-zinc-400 mt-10 mb-2"></div>
            <span className="font-bold text-zinc-900">{signatureLeft}</span>
          </div>

          {/* Firma Entregado */}
          <div className="flex flex-col items-center">
            <div className="w-full border-t border-zinc-400 mt-10 mb-2"></div>
            <span className="font-bold text-zinc-900">{signatureRight}</span>
            <span className="text-[10px] text-zinc-500 mt-1">Firma del Técnico Autorizado</span>
          </div>
        </div>

        {/* Acciones de Impresión / Cierre */}
        <PrintActions printLabel={isSupplier ? "Imprimir Conduce de Envío" : isTech ? "Imprimir Conduce Asignación" : "Imprimir Conduce"} />
      </main>
    </div>
  );
}
