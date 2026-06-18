/**
 * Timezone utilities for Yacelltech Garantías
 *
 * PROBLEMA: Vercel corre en UTC. Cuando en RD son las 8:00 PM (AST, UTC-4),
 * en el server son las 12:00 AM del día siguiente. Esto hace que las fechas
 * y horas de garantías, conduces y reportes salten al día siguiente
 * a partir de las 8:00 PM hora dominicana.
 *
 * SOLUCIÓN: Todos los timestamps y fechas que el usuario ve o guarda
 * se calculan explícitamente en America/Santo_Domingo (UTC-4).
 *
 * Uso:
 *   import { getTodayDateStr, nowSD, nowSDISO } from "@/lib/tz-utils";
 *   const fecha = getTodayDateStr();        // "2026-06-17"
 *   const stamp = nowSDISO();               // ISO con offset -04:00
 *   const now   = nowSD();                  // Date object
 */

const TZ = "America/Santo_Domingo"; // UTC-4 (sin DST en RD)

/**
 * Devuelve la fecha actual en Santo Domingo como "YYYY-MM-DD"
 * (la que el usuario ve en la UI, no la del server)
 */
export function getTodayDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

/**
 * Devuelve un ISO string del momento actual con offset -04:00.
 * Útil para guardar en DB (updated_at, created_at, timestamp).
 * El "wall clock" que ve el usuario en RD coincide con el timestamp.
 */
export function nowSDISO(date: Date = new Date()): string {
  // Construimos el string en hora SD y le pegamos el offset -04:00
  const wallClock = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  // sv-SE da "YYYY-MM-DD HH:MM:SS", lo normalizamos a ISO
  return `${wallClock.replace(" ", "T")}-04:00`;
}

/**
 * Devuelve la hora actual en Santo Domingo formateada para usuarios
 * Ej: "17 de junio de 2026"
 */
export function formatDateSDLong(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Devuelve la hora actual en Santo Domingo en formato "YYYY-MM-DD HH:MM:SS"
 * Útil para IDs únicos legibles
 */
export function getTodayDateTimeStr(date: Date = new Date()): string {
  const dateStr = getTodayDateStr(date);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const second = parts.find((p) => p.type === "second")?.value || "00";

  return `${dateStr} ${hour}:${minute}:${second}`;
}

/**
 * Para usar en APIs de Supabase que esperan un ISO string.
 * Devuelve un timestamp que Supabase interpreta correctamente.
 * NOTA: Postgres/SQLite guardan en UTC por dentro; lo importante es
 * que el "wall clock" que ve el usuario coincida con su hora local.
 */
export function nowSDForDb(date: Date = new Date()): string {
  // Convertir la hora SD a UTC real (sumamos 4h) y devolver ISO
  const sdWallClock = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (t: string) => sdWallClock.find((p) => p.type === t)?.value || "0";
  const y = parseInt(get("year"), 10);
  const mo = parseInt(get("month"), 10) - 1;
  const d = parseInt(get("day"), 10);
  const h = parseInt(get("hour"), 10);
  const mi = parseInt(get("minute"), 10);
  const s = parseInt(get("second"), 10);

  // Crear Date asumiendo que esos números son UTC, luego restar 4h
  // para obtener el momento real del "ahora" en UTC
  const utcAsSD = Date.UTC(y, mo, d, h, mi, s);
  const realUTC = new Date(utcAsSD - 4 * 60 * 60 * 1000);
  return realUTC.toISOString();
}
