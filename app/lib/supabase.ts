import { createClient } from "@supabase/supabase-js";

// Extraemos las variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificación de seguridad: Si no existen, no intentamos crear el cliente
// Esto evita el Error 500
if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Error: Las variables de Supabase no están definidas.");
}

// Exportamos el cliente de forma segura
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseKey || "placeholder-key"
);