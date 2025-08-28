import { UserPreferences, User, FamilyMember } from '../types/user';
import { getThreadContext, addMessageToThread } from './zepService';
import { getSystemStatusObject } from './cortexService';
import { getFamilyMemberByUserId, upsertFamilyMemberContext } from './appDataService';
import { generateSystemPromptForUser } from '../utils/systemBuilder';
import { analizarYGenerarInferencia } from './centinelaService';
import Constants from 'expo-constants';

export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export interface AIMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  senderId: string;
  role: 'user' | 'assistant' | 'system';
  imageUrl?: string;
}

const AI_ID = 'ai-lenor';

/**
 * Normaliza mensajes del historial de ZEP al formato de Chat Completions.
 * Solo deja roles válidos y contenido string.
 */
function normalizeZepHistory(
  history: Array<{ role?: string; content?: any }>
): Array<{ role: 'user' | 'assistant' | 'system'; content: string | any[] }> {
  if (!Array.isArray(history)) return [];
  return history
    .map((m) => {
      const role = (m?.role || '').toLowerCase();
      const content = typeof m?.content === 'string' ? m.content : '';
      if (role === 'user' || role === 'assistant' || role === 'system') {
        return { role, content };
      }
      return null;
    })
    .filter(Boolean) as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

/**
 * Construye el contenido del mensaje del usuario, compatible con modelos multimodales de OpenRouter (p. ej. openai/gpt-4o-mini).
 * IMPORTANTE: usar el formato OpenAI (type: "text" | "image_url"), NO "input_text"/"input_image".
 */
function buildUserContent(message: AIMessage):
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
  if (message.imageUrl) {
    return [
      { type: 'text', text: message.text },
      { type: 'image_url', image_url: { url: message.imageUrl } },
    ];
  }
  return message.text;
}

export const sendMessageToAI = async (
  message: AIMessage,
  userPreferences: UserPreferences | null,
  zepSessionId: string,
  explicitMemoryNotes: string | null,
  authUser: User | null,
  currentConversationId: string,
  inputMode?: string
): Promise<string | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  // Comando explícito para guardar memoria
  const registroCommand = 'Registra en memoria:';
  if (authUser && message.text.trim().startsWith(registroCommand)) {
    const newContext = message.text.trim().substring(registroCommand.length).trim();
    if (newContext) {
      try {
        const result = await upsertFamilyMemberContext(authUser.id, newContext);
        clearTimeout(timeoutId);
        return result
          ? 'Queda guardado en tu contexto.'
          : 'Hubo un problema al intentar guardar tu información.';
      } catch (error) {
        console.error("Error al procesar comando 'Registra en memoria':", error);
        clearTimeout(timeoutId);
        return 'Ocurrió un error inesperado al procesar tu solicitud.';
      }
    } else {
      clearTimeout(timeoutId);
      return "Por favor, proporciona el texto que quieres que guarde después del comando 'Registra en memoria:'.";
    }
  }

  // ENV (ya las tienes en EAS; no se tocan nombres)
  const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY as string | undefined;
  const API_MODEL =
    (process.env.EXPO_PUBLIC_OPENROUTER_MODEL as string | undefined) || 'openai/gpt-4o-mini';

  if (!API_KEY) {
    clearTimeout(timeoutId);
    return 'Falló la respuesta de la IA.';
  }

  try {
    // 1) Memoria ZEP (resumen + últimos mensajes)
    const zepMemory = await getThreadContext(zepSessionId, 'summary');
    if (!zepMemory) throw new Error('No memory returned from ZEP. Cannot build payload.');

    const historyMessagesRaw = (zepMemory.messages || []) as Array<{ role?: string; content?: any }>;
    const historyMessages = normalizeZepHistory(historyMessagesRaw).slice(-10);

    // 2) Perfil familiar (opcional)
    const userEmail = authUser?.email || '';
    let familyMemberProfile: FamilyMember | null = null;
    if (authUser) {
      try {
        familyMemberProfile = await getFamilyMemberByUserId(authUser.id);
      } catch (e) {
        console.warn(`[aiService] No se pudo obtener el perfil para ${authUser.id}. Error:`, e);
      }
    }

    let contextoFamiliarParaPrompt: string | undefined;
    if (!familyMemberProfile) {
      contextoFamiliarParaPrompt = `El usuario actual, ${userEmail}, es un nuevo invitado por Ernesto Loeza. La misión de LéNOR es ser un acompañante inteligente, honesto y funcional.`;
    }

    // 3) Estado del sistema
    const systemStatus = await getSystemStatusObject(zepSessionId);
    const systemStatusString = `Red: ${systemStatus.network}, Zep: ${systemStatus.zepFriendly}, DB: ${systemStatus.supabase}`;
    const currentDate = new Date();
    const appVersion = Constants.expoConfig?.version ?? 'N/A';
    const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? 'N/A';

    // 4) System prompt
    let systemPrompt = generateSystemPromptForUser(
      familyMemberProfile,
      userEmail,
      systemStatusString,
      currentDate,
      userPreferences,
      explicitMemoryNotes,
      contextoFamiliarParaPrompt,
      appVersion,
      buildNumber,
      inputMode
    );

    // 5) Centinela (inyección prioritaria)
    const inferenciaCentinela = await analizarYGenerarInferencia(zepSessionId, { rawText: message.text });
    if (inferenciaCentinela) {
      systemPrompt = `[INFERENCIA DE CENTINELA PRIORITARIA]: ${inferenciaCentinela}\n\n---\n\n${systemPrompt}`;
    }

    // 6) Mensaje del usuario (texto / imagen)
    const userApiMessageContent = buildUserContent(message);

    // 7) Ensamble final de mensajes para la API
    const messagesForAPI: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
    }> = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userApiMessageContent },
    ];

    const parsedMaxTokens = parseInt(process.env.EXPO_PUBLIC_AI_MAX_TOKENS || '', 10);
    const payload = {
      model: API_MODEL,
      messages: messagesForAPI,
      temperature: parseFloat(process.env.EXPO_PUBLIC_AI_TEMPERATURE || '0.69'),
      max_tokens: isNaN(parsedMaxTokens) ? 4096 : parsedMaxTokens,
      user: authUser?.email || zepSessionId || 'anon',
    } as const;

    // 8) Llamada a OpenRouter
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    } as const;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 9) Manejo robusto de errores y extracción
    const json = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      const msg = (json as any)?.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`OpenRouter API Error: ${msg}`);
    }

    const fullResponseText: string =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.delta?.content ??
      '';

    if (!fullResponseText) throw new Error('OpenRouter response OK but no message content.');

    // 10) Persistencia en ZEP (respuesta del asistente)
    await addMessageToThread(zepSessionId, { role: 'assistant', content: fullResponseText });

    return fullResponseText;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[aiService] CRITICAL_ERROR: ${error?.message || error}`);
    return 'Falló la respuesta de la IA.';
  }
};
