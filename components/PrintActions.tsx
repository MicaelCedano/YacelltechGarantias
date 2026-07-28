"use client";

import React from "react";
import { Printer } from "lucide-react";
import toast from "react-hot-toast";

interface PrintActionsProps {
  printLabel: string;
  closeLabel?: string;
  isDarkTheme?: boolean;
}

export function PrintActions({
  printLabel,
  closeLabel = "Cerrar",
  isDarkTheme = false,
}: PrintActionsProps) {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.close();
    }
  };

  const handleShareWhatsApp = async () => {
    const targetElement = document.getElementById("conduce-receipt");
    if (!targetElement) {
      toast.error("No se encontró el elemento del conduce para generar la imagen.");
      return;
    }

    const toastId = toast.loading("Generando comprobante en formato PNG...");

    try {
      const html2canvas = (await import("html2canvas")).default;
      
      // Capturar el contenedor
      const canvas = await html2canvas(targetElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Error al generar el archivo de imagen.", { id: toastId });
          return;
        }

        const file = new File([blob], "comprobante_entrega.png", { type: "image/png" });

        // Intentar usar la API de compartir nativa (ideal para móviles)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Comprobante de Entrega",
              text: "Aquí está el comprobante de entrega de su equipo.",
            });
            toast.success("¡Comprobante compartido con éxito!", { id: toastId });
            return;
          } catch (shareErr) {
            console.log("Diálogo de compartir cerrado o cancelado:", shareErr);
            toast.dismiss(toastId);
            return;
          }
        }

        // Si no está disponible sharing nativo (PC), copiamos al portapapeles y descargamos
        try {
          // Copiar al portapapeles
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": blob,
            }),
          ]);

          // Descarga automática adicional
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Comprobante_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.success(
            "¡Comprobante copiado al portapapeles y descargado! Pégalo en WhatsApp con Ctrl+V.",
            { id: toastId, duration: 6000 }
          );

          // Abrir WhatsApp Web
          window.open("https://web.whatsapp.com/", "_blank", "noopener,noreferrer");
        } catch (clipErr) {
          console.error("Error al copiar al portapapeles:", clipErr);
          
          // Respaldo de descarga pura
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Comprobante_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast.success("Comprobante descargado. Súbelo a WhatsApp manualmente.", {
            id: toastId,
            duration: 6000,
          });
        }
      }, "image/png");

    } catch (err) {
      console.error("Error al procesar la imagen del conduce:", err);
      toast.error("Ocurrió un error al generar la imagen.", { id: toastId });
    }
  };

  // Clases CSS condicionales según el tema visual del contenedor
  const closeBtnClass = isDarkTheme
    ? "px-5 py-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer"
    : "px-5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-650 font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer";

  const printBtnClass = isDarkTheme
    ? "px-5 py-2.5 bg-amber-500 hover:bg-amber-600 border border-amber-600 hover:border-amber-700 text-black font-bold text-xs font-mono-terminal uppercase transition-all tracking-wider cursor-pointer rounded-none shadow-md inline-flex items-center gap-2"
    : "px-5 py-2 bg-amber-500 hover:bg-amber-600 border border-amber-600 text-black font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-1.5";

  const shareBtnClass = isDarkTheme
    ? "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 hover:border-emerald-800 text-white font-bold text-xs font-mono-terminal uppercase transition-all tracking-wider cursor-pointer rounded-none shadow-md inline-flex items-center gap-2"
    : "px-5 py-2 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-bold font-mono-terminal text-xs uppercase tracking-wider transition-all rounded-none cursor-pointer flex items-center gap-1.5";

  return (
    <div className="mt-8 flex justify-end gap-3 no-print border-t border-zinc-900/10 dark:border-zinc-850 pt-5 flex-wrap">
      <button
        onClick={handleClose}
        type="button"
        className={closeBtnClass}
      >
        {closeLabel}
      </button>
      <button
        onClick={handleShareWhatsApp}
        type="button"
        className={shareBtnClass}
      >
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        <span>Compartir por WhatsApp</span>
      </button>
      <button
        onClick={handlePrint}
        type="button"
        className={printBtnClass}
      >
        <Printer className="w-4 h-4" />
        <span>{printLabel}</span>
      </button>
    </div>
  );
}
