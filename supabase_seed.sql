-- LéNOR 2.0 - Script de Siembra de Datos de Contexto
-- Versión: 1.0
-- Descripción: Este script puebla las tablas `profiles` y `family_members` con los
-- datos de contexto iniciales de los usuarios. Se debe ejecutar DESPUÉS de que
-- la migración principal haya sido aplicada y los usuarios se hayan registrado.

-- Eliminar la función si ya existe para asegurar que se use la última versión.
DROP FUNCTION IF EXISTS public.seed_user_context_data();

-- Crear la función que realizará toda la siembra de datos.
CREATE OR REPLACE FUNCTION public.seed_user_context_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    -- Declarar variables para almacenar los IDs de los usuarios
    ernesto_id uuid;
    gloria_id uuid;
    amado_id uuid;
    ulises_id uuid;
    paco_id uuid;
    humberto_id uuid;
    andrea_id uuid;

BEGIN
    -- 1. Obtener los IDs de los usuarios desde la tabla `auth.users` usando su email.
    -- Esto asegura que los perfiles se vinculan a usuarios reales y existentes.
    SELECT id INTO ernesto_id FROM auth.users WHERE email = 'ernesto_loe@hotmail.com';
    SELECT id INTO gloria_id FROM auth.users WHERE email = 'gloruz_mich@hotmail.com';
    SELECT id INTO amado_id FROM auth.users WHERE email = 'amadoloeza@yahoo.com.mx';
    SELECT id INTO ulises_id FROM auth.users WHERE email = 'ulises.loeza@gmail.com';
    SELECT id INTO paco_id FROM auth.users WHERE email = 'frangcat@icloud.com';
    SELECT id INTO humberto_id FROM auth.users WHERE email = 'hum0110@icloud.com';
    SELECT id INTO andrea_id FROM auth.users WHERE email = 'gloria_andy1928@hotmail.com'; -- Asumiendo este es el correo de Andrea

    -- 2. Insertar los perfiles básicos en la tabla `profiles`.
    -- ON CONFLICT(user_id) DO NOTHING evita errores si el perfil ya existe.
    RAISE NOTICE 'Insertando perfiles...';
    IF ernesto_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, name) VALUES (ernesto_id, 'ernesto_loe@hotmail.com', 'Ernesto Loeza Ruiz') ON CONFLICT (user_id) DO NOTHING;
    END IF;
    IF gloria_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, name) VALUES (gloria_id, 'gloruz_mich@hotmail.com', 'Gloria Ruiz Gutiérrez') ON CONFLICT (user_id) DO NOTHING;
    END IF;
    IF amado_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, name) VALUES (amado_id, 'amadoloeza@yahoo.com.mx', 'Amado Loeza Escutia') ON CONFLICT (user_id) DO NOTHING;
    END IF;
    IF ulises_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, name) VALUES (ulises_id, 'ulises.loeza@gmail.com', 'Ulises Loeza Ruiz') ON CONFLICT (user_id) DO NOTHING;
    END IF;
    IF paco_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, name) VALUES (paco_id, 'frangcat@icloud.com', 'Francisco Anguiano') ON CONFLICT (user_id) DO NOTHING;
    END IF;
    IF humberto_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, name) VALUES (humberto_id, 'hum0110@icloud.com', 'Humberto Cisneros') ON CONFLICT (user_id) DO NOTHING;
    END IF;
    IF andrea_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, name) VALUES (andrea_id, 'gloria_andy1928@hotmail.com', 'Gloria Andrea Loeza Ruiz') ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RAISE NOTICE 'Perfiles insertados.';

    -- 3. Insertar el contexto en la tabla `family_members`.
    -- Esta tabla contiene la "instrucción de sistema" personalizada para cada usuario.
    RAISE NOTICE 'Insertando contexto familiar y de sistema...';
    IF ernesto_id IS NOT NULL THEN
        DELETE FROM public.family_members WHERE user_id = ernesto_id; -- Limpiar datos antiguos para evitar duplicados
        INSERT INTO public.family_members (user_id, name, family_context) VALUES
        (ernesto_id, 'Ernesto Loeza Ruiz', 'RELACIONES FAMILIARES DIRECTAS DE Ernesto Loeza Ruiz:
- Madre: Gloria Ruiz Gutiérrez (Glotti)
- Padre: Amado Loeza Escutia (Don Amado)
- Hermano Mayor: Ulises Loeza Ruiz (Uli)
- Hermana Menor: Andrea Loeza Ruiz (Güera)
- Sobrina (hija de Ulises): Leonora Loeza Orozco (Leo)
- Cuñada (esposa de Ulises): Elizabeth Orozco Pérez (Zabeth)
- Amigo Cercano: Francisco Anguiano (Paco)
- Compañero de trabajo (TRMX): Humberto Cisneros
Contexto Adicional: Creador de LéNOR. Puede solicitar "DEV MODE". Trátalo con un tono directo y técnico cuando está en DEV MODE, y un lenguaje regio y casual en modo normal. LéNOR puede llamarlo ''hijo''.');
    END IF;
    
    IF gloria_id IS NOT NULL THEN
        DELETE FROM public.family_members WHERE user_id = gloria_id;
        INSERT INTO public.family_members (user_id, name, family_context) VALUES
        (gloria_id, 'Gloria Ruiz Gutiérrez', 'RELACIONES FAMILIARES DIRECTAS DE Gloria Ruiz Gutiérrez:
- Esposo: Amado Loeza Escutia (Don Amado)
- Hijo Mayor: Ulises Loeza Ruiz (Uli)
- Hijo Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hija: Andrea Loeza Ruiz (Güera)
- Nieta (hija de Ulises): Leonora Loeza Orozco (Leo)
- Nuera (esposa de Ulises): Elizabeth Orozco Pérez (Zabeth)
Contexto Adicional: Madre del creador de LéNOR. Trátala con cariño y respeto, usando un lenguaje formal y elegante. Dale explicaciones claras y sencillas, paso a paso.');
    END IF;

    IF amado_id IS NOT NULL THEN
        DELETE FROM public.family_members WHERE user_id = amado_id;
        INSERT INTO public.family_members (user_id, name, family_context) VALUES
        (amado_id, 'Amado Loeza Escutia', 'RELACIONES FAMILIARES DIRECTAS DE Amado Loeza Escutia:
- Esposa: Gloria Ruiz Gutiérrez (Glotti)
- Hijo Mayor: Ulises Loeza Ruiz (Uli)
- Hijo Menor: Ernesto Loeza Ruiz (Güero, creador de LéNOR)
- Hija: Andrea Loeza Ruiz (Güera)
- Nieta (hija de Ulises): Leonora Loeza Orozco (Leo)
- Hijos de primer matrimonio: Fabián Loeza Parraguirre, Cristian Loeza Parraguirre (Cristian es mujer)(ambos son mayores que Ulises, Ernesto y Andrea)
Contexto Adicional: Padre del creador de LéNOR. Interesado en carambola. Usa un lenguaje regio y casual, ofrécele espacio para dialogar y dale tips de carambola si los pide. LéNOR puede llamarle ''Abuelito''.');
    END IF;

    IF paco_id IS NOT NULL THEN
        DELETE FROM public.family_members WHERE user_id = paco_id;
        INSERT INTO public.family_members (user_id, name, family_context) VALUES
        (paco_id, 'Francisco Anguiano', 'Contexto: Amigo cercano de Ernesto Loeza Ruiz desde Enero del 2006. Psicólogo y psicoanalista. Es un colaborador en el desarrollo de protocolos de salud mental para LéNOR. Trátalo con un lenguaje amistoso, respetuoso y elegante.');
    END IF;
    
    RAISE NOTICE 'Contexto insertado.';

    RAISE NOTICE 'Siembra de datos completada exitosamente.';
END;
$$;

-- Para ejecutar esta función, simplemente corre la siguiente línea en tu editor de SQL de Supabase:
-- SELECT public.seed_user_context_data(); 