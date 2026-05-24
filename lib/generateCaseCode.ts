import { supabase } from "./supabase";

/**
 * Genera un código de garantía con el formato GAR-MMDD-###.
 * Donde ### es una secuencia de 3 dígitos que se reinicia diariamente.
 * @param entryDateStr Fecha de entrada en formato YYYY-MM-DD
 */
export async function generateCaseCode(entryDateStr: string): Promise<string> {
  if (!entryDateStr) {
    throw new Error("La fecha de entrada es obligatoria para generar el código");
  }

  // Dividir la fecha YYYY-MM-DD
  const dateParts = entryDateStr.split("-");
  if (dateParts.length !== 3) {
    throw new Error("Formato de fecha inválido. Se requiere YYYY-MM-DD.");
  }

  const mm = dateParts[1];
  const dd = dateParts[2];
  const prefix = `GAR-${mm}${dd}-`;

  // Buscar el caso con el código más alto para este prefijo en Supabase
  const { data, error } = await supabase
    .from("warranty_cases")
    .select("case_code")
    .like("case_code", `${prefix}%`)
    .order("case_code", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error consultando código de caso en Supabase:", error);
    throw error;
  }

  let nextSequence = 1;

  if (data && data.length > 0) {
    const lastCode = data[0].case_code;
    const parts = lastCode.split("-");
    const sequenceStr = parts[parts.length - 1];
    const sequenceNum = parseInt(sequenceStr, 10);

    if (!isNaN(sequenceNum)) {
      nextSequence = sequenceNum + 1;
    }
  }

  const sequenceFormatted = String(nextSequence).padStart(3, "0");
  return `${prefix}${sequenceFormatted}`;
}
