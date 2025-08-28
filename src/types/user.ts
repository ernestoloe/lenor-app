export interface UserPreferences {
  voice_locale?: string;
  voice_mode_enabled?: boolean;
  dev_mode_code?: string;
  is_minor_requiring_adult?: boolean;
  preferences?: string[];
  empathetic?: boolean;
  confrontational?: boolean;
  detailed?: boolean;
  concise?: boolean;
  creative?: boolean;
  logical?: boolean;
  nicknameForLenor?: string;
  workScheduleNotes?: string;
  hobbiesNotes?: string;
  relationshipsNotes?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * Define la estructura de un miembro de la familia.
 * Esta interfaz se usa tanto en la app como para mapear los datos de Supabase.
 */
export interface FamilyMember {
  name: string;
  aliases: string[];
  familyContext: string;
} 