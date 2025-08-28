import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Si faltan variables de entorno, no interrumpimos la app.
// Creamos un "placeholder" para que el resto del código no reviente y
// mostramos un error claro en consola; la UI podrá detectarlo y avisar al usuario.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '\u26A0\uFE0F  Supabase: faltan variables EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_KEY. ' +
    'La app funcionará en modo limitado (sin backend).'
  );
}

// Configuración del cliente de Supabase para React Native
// Utiliza AsyncStorage para la persistencia de la sesión, que es más rápido y estable.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
