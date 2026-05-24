import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-anon-key";

/**
 * Retorna true si no están definidas las variables de entorno de Supabase,
 * o si contienen los valores de ejemplo provistos por defecto.
 */
export function isMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
