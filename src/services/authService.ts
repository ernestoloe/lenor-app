// ===== src/services/authService.ts (reemplazo completo) =====
import { supabase } from './supabaseClient';
import type { User } from '../types/user';

// Inicia sesión (lo que AuthContext llama signIn)
export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const u = data.user!;
  const meta = (u.user_metadata || {}) as { name?: string };
  return { id: u.id, email: u.email || email, name: meta.name || '' };
}

// Registro básico (name opcional). OJO: puede requerir confirmación por correo.
export async function signUp(email: string, password: string, name?: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  const u = data.user; // puede venir null si requiere verificación
  return {
    id: u?.id || 'pending',
    email,
    name: (u?.user_metadata?.name as string | undefined) || name || '',
  };
}

// Cerrar sesión (lo que AuthContext llama signOut)
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Exports opcionales si en otro lado usabas estos nombres
export { signIn as loginWithEmail, signOut as logout };
