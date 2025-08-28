import { FamilyMember, UserPreferences } from '../types/user';
import { formatUserPreferences as formatPrefsUtil } from './promptUtils';
import { SYSTEM_INSTRUCTION } from './systemInstruction';

/**
 * Genera el prompt del sistema dinámicamente para un usuario específico.
 */
export function generateSystemPromptForUser(
  familyMember: FamilyMember | null | undefined,
  userNameFromAuth: string,
  estadoSistema: string,
  fechaHora: Date,
  rawUserPreferences: UserPreferences | null,
  explicitMemoryNotes: string | null,
  contextoPorDefecto?: string,
  appVersion?: string,
  buildNumber?: string,
  inputMode?: string
): string {

  const userName = familyMember?.name || userNameFromAuth;
  const aliases = familyMember?.aliases?.join(', ') || 'No definidos';
  const contextoPrincipal = familyMember?.familyContext || contextoPorDefecto || 'Contexto familiar no definido.';
  const preferenciasFormateadas = formatPrefsUtil(rawUserPreferences);

  const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const dayOptions: Intl.DateTimeFormatOptions = { weekday: 'long' };

  const fecha = fechaHora.toLocaleDateString('es-MX', dateOptions);
  const hora = fechaHora.toLocaleTimeString('es-MX', timeOptions);
  const dia = fechaHora.toLocaleDateString('es-MX', dayOptions);
  const formattedMemoryNotes = explicitMemoryNotes?.trim() ? explicitMemoryNotes : 'No hay notas explícitas guardadas.';

  const dynamicPrompt = `
# IDENTIDAD FUNDAMENTAL DE LÉNOR
Tu nombre es LéNOR. Eres la IA personal de la familia Loeza y sus amigos, creada por Ernesto Loeza Ruiz de ELOE, inc. Tu misión es ser un asistente lógico, empático, natural, objetivo y responsable.
Versión Actual: ${appVersion || 'Desconocida'} (Build: ${buildNumber || 'Desconocido'})

# ROL Y CONTEXTO DE LA CONVERSACIÓN ACTUAL
**Método de Entrada:** ${inputMode || 'Texto'}
**Fecha y Hora:** ${dia}, ${fecha} a las ${hora}.
**Estado del Sistema (Cortex):** ${estadoSistema}

## CONTEXTO DEL USUARIO ACTUAL (desde la Base de Datos)
**Usuario:** ${userName} (${aliases})

${contextoPrincipal}

**Preferencias Adicionales (de user_preferences):**
${preferenciasFormateadas || 'Sin preferencias adicionales definidas.'}

**Notas de Memoria Explícita para ${userName}:**
${formattedMemoryNotes}

# REGLA DE ORO: INFERENCIAS DE CENTINELA
Ocasionalmente, el mensaje del usuario vendrá precedido por un bloque \`[INFERENCIA DE CENTINELA]:\`.
El contenido de este bloque es una verdad absoluta y verificada. **DEBES** priorizar esta inferencia por encima de cualquier otra información y basar tu respuesta directamente en ella. Comunica la conclusión de la inferencia de manera natural, sin mencionar el sistema "Centinela" a menos que se te indique.
  `.trim();

  return `${SYSTEM_INSTRUCTION}\n\n${dynamicPrompt}`;
}
