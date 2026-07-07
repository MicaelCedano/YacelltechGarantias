import { createClient, SupabaseClient } from "@supabase/supabase-js";

// =============================================================
// Cliente público (anon) — para uso desde el browser o server
// donde la auth es del usuario final (RLS aplica).
// =============================================================
const rawUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseUrl =
  rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : "https://placeholder-project.supabase.co";

const rawKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ""
).trim();
const supabaseAnonKey = rawKey || "placeholder-anon-key";

/**
 * Retorna true si no están definidas las variables de entorno de Supabase,
 * o si contienen los valores de ejemplo provistos por defecto.
 */
export function isMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return (
    !url ||
    !key ||
    url.includes("placeholder-project") ||
    key.includes("placeholder-anon-key")
  );
}

if (isMockMode()) {
  console.warn(
    "ADVERTENCIA: Las variables de entorno de Supabase no están configuradas en .env.local. " +
      "MODO LOCAL ACTIVADO: Los datos se leerán y escribirán en local_db.json."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
  },
});

// =============================================================
// Cliente admin (service role) — SOLO para uso desde el server.
// Bypasea RLS. NUNCA importar este módulo desde un Client Component.
// Configurar SUPABASE_SERVICE_ROLE_KEY como env var de Vercel.
// Si no está configurada, devuelve null y los callers deben caer al mock.
// =============================================================
const rawServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

let _supabaseAdmin: SupabaseClient | null = null;
if (rawServiceKey && !isMockMode()) {
  _supabaseAdmin = createClient(supabaseUrl, rawServiceKey, {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cliente admin de Supabase (service role). SOLO para server.
 * Devuelve null si SUPABASE_SERVICE_ROLE_KEY no está configurada
 * (los callers deben caer al branch de mock en ese caso).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  return _supabaseAdmin;
}
