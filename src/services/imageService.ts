import { supabase } from './supabaseClient';
import * as FileSystem from 'expo-file-system';
import mime from 'mime';

export const uploadImageToSupabase = async (uri: string): Promise<string> => {
  const fileName = uri.split('/').pop();
  const mimeType = mime.getType(uri) || 'image/jpeg';

  const response = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.storage
    .from('image-uploads')
    .upload(`chat-images/${fileName}`, Buffer.from(response, 'base64'), {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error('Error al subir imagen:', error);
    throw new Error('No se pudo subir la imagen.');
  }

  const { data: publicUrlData } = supabase.storage
    .from('image-uploads')
    .getPublicUrl(data.path);

  if (!publicUrlData.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen.');
  }

  return publicUrlData.publicUrl;
};
