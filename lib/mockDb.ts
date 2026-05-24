import fs from "fs";
import path from "path";

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

const DB_PATH = path.join(process.cwd(), "local_db.json");

// Leer archivo JSON local
function readDb(): WarrantyCase[] {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return [];
    }
    const content = fs.readFileSync(DB_PATH, "utf-8");
    if (!content.trim()) return [];
    return JSON.parse(content);
  } catch (error) {
    console.error("Error de lectura en local_db.json:", error);
    return [];
  }
}

// Escribir archivo JSON local
function writeDb(data: WarrantyCase[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error de escritura en local_db.json:", error);
  }
}

/**
 * Obtener todos los casos del archivo JSON local.
 */
export async function getMockCases(): Promise<WarrantyCase[]> {
  return readDb();
}

/**
 * Buscar un caso por su código (case-insensitive).
 */
export async function getMockCaseByCode(caseCode: string): Promise<WarrantyCase | null> {
  const cases = readDb();
  const found = cases.find((c) => c.case_code.toUpperCase() === caseCode.toUpperCase());
  return found || null;
}

/**
 * Insertar un nuevo caso localmente.
 */
export async function saveMockCase(newCase: {
  imei: string;
  model: string;
  client_name: string;
  problem: string;
  entry_date: string;
  status: string;
  case_code: string;
}): Promise<WarrantyCase> {
  const cases = readDb();
  const timestamp = new Date().toISOString();
  
  const caseToSave: WarrantyCase = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
    ...newCase,
    created_at: timestamp,
    updated_at: timestamp,
  };
  
  // Agregar al inicio para tener orden cronológico descendente por defecto
  cases.unshift(caseToSave);
  writeDb(cases);
  return caseToSave;
}

/**
 * Actualizar el estado de una garantía local.
 */
export async function updateMockCaseStatus(caseCode: string, status: string): Promise<WarrantyCase | null> {
  const cases = readDb();
  const idx = cases.findIndex((c) => c.case_code.toUpperCase() === caseCode.toUpperCase());
  
  if (idx === -1) return null;
  
  cases[idx] = {
    ...cases[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  
  writeDb(cases);
  return cases[idx];
}

/**
 * Actualizar campos arbitrarios de una garantía local.
 */
export async function updateMockCaseFields(
  caseCode: string,
  fields: {
    imei?: string;
    model?: string;
    client_name?: string;
    problem?: string;
    status?: string;
  }
): Promise<WarrantyCase | null> {
  const cases = readDb();
  const idx = cases.findIndex((c) => c.case_code.toUpperCase() === caseCode.toUpperCase());
  
  if (idx === -1) return null;
  
  cases[idx] = {
    ...cases[idx],
    ...fields,
    updated_at: new Date().toISOString(),
  };
  
  writeDb(cases);
  return cases[idx];
}

/**
 * Eliminar físicamente una garantía local del sistema.
 */
export async function deleteMockCase(caseCode: string): Promise<boolean> {
  const cases = readDb();
  const idx = cases.findIndex((c) => c.case_code.toUpperCase() === caseCode.toUpperCase());
  
  if (idx === -1) return false;
  
  cases.splice(idx, 1);
  writeDb(cases);
  return true;
}

/**
 * Genera un código correlativo GAR-MMDD-### leyendo el archivo local_db.json
 */
export async function generateMockCaseCode(entryDateStr: string): Promise<string> {
  const dateParts = entryDateStr.split("-"); // YYYY-MM-DD
  if (dateParts.length !== 3) {
    throw new Error("Formato de fecha inválido para código local.");
  }
  
  const mm = dateParts[1];
  const dd = dateParts[2];
  const prefix = `GAR-${mm}${dd}-`;
  
  const cases = readDb();
  
  // Filtrar los casos que pertenecen al día y ordenarlos alfabéticamente descendiente
  const dailyCases = cases
    .filter((c) => c.case_code.startsWith(prefix))
    .sort((a, b) => b.case_code.localeCompare(a.case_code));
    
  let nextSequence = 1;
  
  if (dailyCases.length > 0) {
    const lastCode = dailyCases[0].case_code;
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

export interface ConduceRecord {
  id: string;
  client_name: string;
  delivery_date: string;
  case_codes: string[];
  created_at: string;
  is_supplier?: boolean;
}

const CONDUCES_DB_PATH = path.join(process.cwd(), "conduces_db.json");

function readConducesDb(): ConduceRecord[] {
  try {
    if (!fs.existsSync(CONDUCES_DB_PATH)) {
      return [];
    }
    const content = fs.readFileSync(CONDUCES_DB_PATH, "utf-8");
    if (!content.trim()) return [];
    return JSON.parse(content);
  } catch (error) {
    console.error("Error de lectura en conduces_db.json:", error);
    return [];
  }
}

function writeConducesDb(data: ConduceRecord[]) {
  try {
    fs.writeFileSync(CONDUCES_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error de escritura en conduces_db.json:", error);
  }
}

export async function getMockConduces(): Promise<ConduceRecord[]> {
  return readConducesDb();
}

export async function generateMockConduceCode(deliveryDateStr: string, isSupplier?: boolean): Promise<string> {
  const dateParts = deliveryDateStr.split("-"); // YYYY-MM-DD
  if (dateParts.length !== 3) {
    throw new Error("Formato de fecha inválido para código de conduce.");
  }
  
  const mm = dateParts[1];
  const dd = dateParts[2];
  const prefix = isSupplier ? `SUPL-${mm}${dd}-` : `COND-${mm}${dd}-`;
  
  const conduces = readConducesDb();
  
  const dailyConduces = conduces
    .filter((c) => c.id.startsWith(prefix))
    .sort((a, b) => b.id.localeCompare(a.id));
    
  let nextSequence = 1;
  
  if (dailyConduces.length > 0) {
    const lastCode = dailyConduces[0].id;
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

export async function saveMockConduce(newConduce: {
  client_name: string;
  delivery_date: string;
  case_codes: string[];
  is_supplier?: boolean;
}): Promise<ConduceRecord> {
  const conduces = readConducesDb();
  const code = await generateMockConduceCode(newConduce.delivery_date, newConduce.is_supplier);
  const timestamp = new Date().toISOString();
  
  const recordToSave: ConduceRecord = {
    id: code,
    ...newConduce,
    created_at: timestamp,
  };
  
  conduces.unshift(recordToSave);
  writeConducesDb(conduces);
  return recordToSave;
}
