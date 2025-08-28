import { FamilyMember } from '../types/user';
import { supabase } from './supabaseClient';

/**
 * Busca un miembro de la familia en la base de datos por su ID de usuario.
 * @param userId El ID del usuario a buscar.
 * @returns El perfil del miembro de la familia o null si no se encuentra.
 */
export const getFamilyMemberByUserId = async (
  userId: string
): Promise<FamilyMember | null> => {
  try {
    const { data, error } = await supabase
      .from('family_members')
      .select('name, aliases, family_context')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error al buscar miembro de la familia en Supabase:', error);
      }
      return null;
    }

    if (data) {
        return {
            name: data.name,
            aliases: data.aliases || [],
            familyContext: data.family_context,
        };
    }

    return null;
  } catch (err) {
    console.error('Error inesperado en getFamilyMemberByUserId:', err);
    return null;
  }
};

/**
 * Crea o actualiza el contexto de un miembro de la familia.
 * @param userId El ID del usuario a actualizar.
 * @param newContext El nuevo texto de contexto a guardar.
 * @returns Un objeto con los datos actualizados o null si hay un error.
 */
export const upsertFamilyMemberContext = async (userId: string, newContext: string) => {
  try {
    // Primero, intenta obtener el registro existente para no sobreescribir otros campos.
    const { data: existingData, error: selectError } = await supabase
      .from('family_members')
      .select('name, aliases, family_context')
      .eq('user_id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error al buscar para hacer upsert en family_members:', selectError);
      return null;
    }

    const name = existingData?.name || 'Usuario'; // 'Usuario' como fallback si no hay nombre
    const aliases = existingData?.aliases || [];
    // Aquí podrías decidir si quieres añadir al contexto existente o reemplazarlo.
    // Por ahora, lo reemplazaremos.
    const family_context = newContext;

    const { data, error } = await supabase
      .from('family_members')
      .upsert({
        user_id: userId,
        name: name,
        aliases: aliases,
        family_context: family_context
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error en upsert de family_members:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error inesperado en upsertFamilyMemberContext:', err);
    return null;
  }
};

/**
 * Obtiene todos los anuncios activos de la base de datos.
 * @returns Una lista de anuncios activos.
 */
export const getActiveAnnouncementsFromDB = async () => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .select('message, created_at')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error al obtener anuncios de Supabase:', error);
            return [];
        }

        return data;
    } catch (err) {
        console.error('Error inesperado en getActiveAnnouncementsFromDB:', err);
        return [];
    }
} 