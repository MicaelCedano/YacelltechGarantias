import { WarrantyCase } from "@/components/CaseDrawer";

/**
 * Función auxiliar para sanitizar valores de celdas en CSV.
 * Maneja comillas, comas y saltos de línea.
 */
function sanitizeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Dispara la descarga de un archivo en el navegador del usuario.
 */
export function downloadBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta una lista de casos de garantía a formato CSV (Compatible con Excel mediante BOM UTF-8).
 */
export function exportWarrantiesToCSV(cases: WarrantyCase[], filenamePrefix = "Garantias_Yacelltech"): void {
  const headers = [
    "Código Caso",
    "Cliente",
    "Modelo",
    "IMEI / Serie",
    "Falla / Problema",
    "Estado",
    "Fecha de Entrada",
    "Fecha de Creación",
    "Última Actualización",
    "ID Registrado"
  ];

  const rows = cases.map((item) => [
    sanitizeCSVCell(item.case_code),
    sanitizeCSVCell(item.client_name),
    sanitizeCSVCell(item.model),
    sanitizeCSVCell(item.imei),
    sanitizeCSVCell(item.problem),
    sanitizeCSVCell(item.status),
    sanitizeCSVCell(item.entry_date),
    sanitizeCSVCell(item.created_at ? new Date(item.created_at).toLocaleString("es-DO") : ""),
    sanitizeCSVCell(item.updated_at ? new Date(item.updated_at).toLocaleString("es-DO") : ""),
    sanitizeCSVCell(item.id)
  ]);

  // UTF-8 BOM (\uFEFF) para abrir correctamente en Excel con acentos y eñes
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  
  const today = new Date().toISOString().split("T")[0];
  const filename = `${filenamePrefix}_${today}.csv`;

  downloadBlob(csvContent, filename, "text/csv;charset=utf-8;");
}

/**
 * Exporta una lista de casos de garantía a formato JSON para importación directa en APIs o DBs.
 */
export function exportWarrantiesToJSON(cases: WarrantyCase[], filenamePrefix = "Garantias_Yacelltech"): void {
  const jsonContent = JSON.stringify(cases, null, 2);
  const today = new Date().toISOString().split("T")[0];
  const filename = `${filenamePrefix}_${today}.json`;

  downloadBlob(jsonContent, filename, "application/json;charset=utf-8;");
}
