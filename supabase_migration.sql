-- Esquema Completo y Optimizado de Supabase para LéNOR 2.0
-- Versión: 6 (Optimizada para RLS)
-- Descripción: Este script incluye una función auxiliar para optimizar el rendimiento de las
-- políticas de seguridad (RLS), resolviendo las advertencias del Performance Advisor.

-- 0. Eliminar tablas antiguas para asegurar un estado limpio
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.conversations;
DROP TABLE IF EXISTS public.family_members;
DROP TABLE IF EXISTS public.user_preferences;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.announcements;


-- 1. Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 2. Función Auxiliar para Optimización de RLS
-- Esta función obtiene el ID del usuario actual una sola vez por consulta.
CREATE OR REPLACE FUNCTION public.get_requesting_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT auth.uid();
$$;
COMMENT ON FUNCTION public.get_requesting_user_id() IS 'Returns the UID of the currently authenticated user for RLS policies.';


-- 3. Definición de Tablas

-- Tabla de Perfiles de Usuario
-- Vinculada directamente a la tabla de autenticación de Supabase.
CREATE TABLE public.profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Stores user profile information linked to authentication.';

-- Tabla de Preferencias de Usuario
CREATE TABLE public.user_preferences (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    voice_locale TEXT DEFAULT 'es-MX' NOT NULL,
    voice_mode_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    dev_mode_code TEXT,
    is_minor_requiring_adult BOOLEAN DEFAULT FALSE,
    preferences TEXT[]
);
COMMENT ON TABLE public.user_preferences IS 'Stores user-specific settings and preferences.';

-- Tabla de Miembros Familiares
CREATE TABLE public.family_members (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    aliases TEXT[],
    family_context TEXT
);
COMMENT ON TABLE public.family_members IS 'Stores family members and their context for each user.';

-- Tabla de Conversaciones
CREATE TABLE public.conversations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Nueva Conversación',
    zep_session_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.conversations IS 'Groups messages into distinct conversation threads.';

-- Tabla de Mensajes de Chat
CREATE TABLE public.chat_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    is_user BOOLEAN NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.chat_messages IS 'Stores individual chat messages from users or the AI.';

-- Tabla de Anuncios
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.announcements IS 'For system-wide announcements.';


-- 4. Políticas de Seguridad (Row Level Security - RLS) Optimizadas

-- Habilitar RLS en todas las tablas relevantes
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas actualizadas para usar la función auxiliar
CREATE POLICY "Los usuarios pueden ver su propio perfil." ON public.profiles FOR SELECT USING (public.get_requesting_user_id() = user_id);
CREATE POLICY "Los usuarios pueden actualizar su propio perfil." ON public.profiles FOR UPDATE USING (public.get_requesting_user_id() = user_id);
CREATE POLICY "Los usuarios pueden insertar su propio perfil." ON public.profiles FOR INSERT WITH CHECK (public.get_requesting_user_id() = user_id);

CREATE POLICY "Los usuarios pueden gestionar sus preferencias." ON public.user_preferences FOR ALL USING (public.get_requesting_user_id() = user_id);
CREATE POLICY "Los usuarios pueden gestionar sus propios miembros familiares." ON public.family_members FOR ALL USING (public.get_requesting_user_id() = user_id);
CREATE POLICY "Los usuarios pueden gestionar sus propias conversaciones." ON public.conversations FOR ALL USING (public.get_requesting_user_id() = user_id);
CREATE POLICY "Los usuarios pueden gestionar los mensajes de sus conversaciones." ON public.chat_messages FOR ALL USING (public.get_requesting_user_id() = user_id);

-- Políticas para `storage`
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('image-uploads', 'image-uploads', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Borrar políticas antiguas de Storage por si existen para evitar conflictos
DROP POLICY IF EXISTS "Los usuarios autenticados pueden subir imágenes." ON storage.objects;
DROP POLICY IF EXISTS "Cualquiera puede ver las imágenes." ON storage.objects;
DROP POLICY IF EXISTS "Los usuarios pueden borrar sus propias imágenes." ON storage.objects;

-- Crear políticas nuevas de Storage
CREATE POLICY "Los usuarios autenticados pueden subir imágenes."
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'image-uploads' AND public.get_requesting_user_id() = owner);

CREATE POLICY "Cualquiera puede ver las imágenes."
ON storage.objects FOR SELECT TO public USING (bucket_id = 'image-uploads');

CREATE POLICY "Los usuarios pueden borrar sus propias imágenes."
ON storage.objects FOR DELETE TO authenticated USING (public.get_requesting_user_id() = owner);


-- 5. Datos Iniciales (Seed Data)

INSERT INTO public.announcements (message, created_by, is_active)
VALUES ('¡Bienvenida a la nueva versión de LéNOR! Hemos actualizado la infraestructura de la app para una mejor experiencia.', 'system', true)
ON CONFLICT (id) DO NOTHING;

-- Fin del script 