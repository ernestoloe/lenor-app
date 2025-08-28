import { supabase } from './supabaseClient';
import { UserPreferences } from '../types/user';
import { generateId } from '../utils/id';
import { familyContextData } from '../ai/familyContextData';
import { getFamilyMemberByUserId } from './appDataService';

// Tipos para las respuestas para mayor claridad
interface ConversationInfo {
  id: string;
  zep_session_id: string;
  title: string | null;
  created_at: string;
}

/**
 * Obtiene la conversación más reciente de un usuario o crea una nueva si no existe.
 * Esta función es la fuente de verdad para la gestión de sesiones.
 * @param userId - El ID del usuario autenticado.
 * @returns Un objeto con el id de la conversación y el zep_session_id.
 */
export const getOrCreateLatestConversation = async (userId: string): Promise<ConversationInfo> => {
  // 1. Buscar la conversación más reciente en Supabase
  const { data: latestConvo, error: fetchError } = await supabase
    .from('conversations')
    .select('id, zep_session_id, title, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // 'PGRST116' es 'not found'
    console.error('Error fetching latest conversation:', fetchError);
    throw new Error('No se pudo obtener la conversación más reciente.');
  }

  if (latestConvo) {
    console.log(`Conversación existente encontrada: ${latestConvo.id} con Zep Session: ${latestConvo.zep_session_id}`);
    return latestConvo;
  }

  // 2. Si no se encuentra, crear una nueva conversación
  console.log(`No se encontraron conversaciones para el usuario ${userId}. Creando una nueva...`);
  const newZepSessionId = generateId();
  const { data: newConvo, error: createError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      zep_session_id: newZepSessionId,
      title: 'Nueva Conversación'
    })
    .select('id, zep_session_id, title, created_at')
    .single();

  if (createError || !newConvo) {
    console.error('Error creating new conversation:', createError);
    throw new Error('No se pudo crear una nueva conversación.');
  }
  
  console.log(`Nueva conversación creada: ${newConvo.id} con Zep Session: ${newConvo.zep_session_id}`);
  return newConvo;
};

export const getUserPreferencesAndNotes = async (userId: string): Promise<{
  preferences: UserPreferences | null;
  explicit_memory_notes: string | null; // A futuro esto puede venir de otra tabla
} | null> => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error getting user preferences:', error);
    }
    return null;
  }
  
  // Por ahora, las notas de memoria explícita no tienen una tabla.
  // Se podría añadir una tabla 'explicit_memory' en el futuro.
  return {
    preferences: data as UserPreferences,
    explicit_memory_notes: null 
  };
};

export const updateUserPreferences = async (userId: string, newPreferences: Partial<UserPreferences>) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(newPreferences)
    .eq('user_id', userId)
    .select();

  if (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
  return data;
};

export const uploadImage = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();

  const fileExt = uri.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from('image-uploads')
    .upload(filePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Error al subir la imagen a Supabase Storage.');
  }

  const { data: publicUrlData } = supabase.storage
    .from('image-uploads')
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen.');
  }

  console.log('Image uploaded successfully. Public URL:', publicUrlData.publicUrl);
  return publicUrlData.publicUrl;
};

export const getUserConversations = async (userId: string): Promise<ConversationInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, zep_session_id, title, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error in getUserConversations:', error);
    return [];
  }
};

/**
 * Crea una nueva conversación para un usuario en Supabase.
 * @param userId - El ID del usuario.
 * @param title - Un título opcional para la conversación.
 * @returns La información de la nueva conversación.
 */
export const createNewConversation = async (userId: string, title?: string): Promise<ConversationInfo> => {
  console.log(`Creando nueva conversación para el usuario ${userId}...`);
  const newZepSessionId = generateId();
  const { data: newConvo, error: createError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      zep_session_id: newZepSessionId,
      title: title || 'Nueva Conversación'
    })
    .select('id, zep_session_id, title, created_at')
    .single();

  if (createError || !newConvo) {
    console.error('Error creating new conversation in service:', createError);
    throw new Error('No se pudo crear una nueva conversación.');
  }
  
  console.log(`Nueva conversación creada con éxito: ${newConvo.id}`);
  return newConvo;
};

/**
 * Obtiene el perfil de un usuario o lo crea si no existe.
 * Esta es una función crítica para asegurar la integridad de los datos del usuario.
 * @param userId - El ID del usuario.
 * @param email - El email del usuario, para crearlo si es necesario.
 * @returns El objeto del perfil.
 */
export const getOrCreateProfile = async (userId: string, email: string) => {
  // 1. Intentar obtener el perfil existente.
  let { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Error al obtener el perfil de usuario:', fetchError);
    throw new Error('No se pudo obtener el perfil de usuario.');
  }

  // 2. Si el perfil no existe, crearlo de forma inteligente.
  if (!profile) {
    console.log(`Perfil no encontrado para ${userId}. Buscando en datos estáticos...`);
    
    const staticData = familyContextData.find(p => p.email.toLowerCase() === email.toLowerCase());
    
    const profileName = staticData?.name || email.split('@')[0];

    // Crear el perfil base
    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({ user_id: userId, email: email, name: profileName })
      .select()
      .single();
    
    if (createProfileError) {
      console.error('Error al crear el perfil de usuario:', createProfileError);
      throw new Error('No se pudo crear el perfil de usuario.');
    }
    
    // Si encontramos datos estáticos, crear también la entrada en family_members
    if (staticData) {
      console.log(`Creando entrada en family_members para ${profileName}...`);
      const { error: createFamilyMemberError } = await supabase
        .from('family_members')
        .insert({
          user_id: userId,
          name: staticData.name,
          aliases: staticData.aliases,
          family_context: staticData.context
        });

      if (createFamilyMemberError) {
        // No lanzamos un error fatal aquí, pero sí lo registramos.
        console.error('Error al crear la entrada en family_members:', createFamilyMemberError);
      }
    }
    
    profile = newProfile;
    console.log(`Perfil creado con éxito para ${userId}.`);
  } else {
    // LÓGICA DE CORRECCIÓN: Si el perfil existe, verificar que el vínculo con family_members también exista.
    const familyMember = await getFamilyMemberByUserId(userId);
    if (!familyMember) {
      console.log(`CORRECCIÓN: El perfil para ${email} existe, pero falta el vínculo en family_members. Intentando crearlo...`);
      const staticData = familyContextData.find(p => p.email.toLowerCase() === email.toLowerCase());
      if (staticData) {
        const { error: createFamilyMemberError } = await supabase
          .from('family_members')
          .insert({
            user_id: userId,
            name: staticData.name,
            aliases: staticData.aliases,
            family_context: staticData.context
          });
        if (createFamilyMemberError) {
          console.error('Error al crear la entrada en family_members (lógica de corrección):', createFamilyMemberError);
        } else {
          console.log(`CORRECCIÓN: Vínculo en family_members creado exitosamente para ${staticData.name}.`);
        }
      }
    }
  }

  return profile;
};
