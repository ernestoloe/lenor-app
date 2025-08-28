import { addMessageToThread, getThreadContext } from './zepService';

const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const API_MODEL_CENTINELA =
  process.env.EXPO_PUBLIC_OPENROUTER_MODEL_CENTINELA || 'openai/gpt-4o-mini';

/**
 * Analiza el texto del usuario y devuelve una inferencia prioritaria si detecta
 * algo emocionalmente relevante/urgente. Devuelve null si no hay nada.
 */
export const analizarYGenerarInferencia = async (
  zepSessionId: string,
  options: { rawText: string }
): Promise<string | null> => {
  try {
    const raw = options?.rawText ?? '';
    const texto = typeof raw === 'string' ? raw.trim() : '';
    if (!texto) return null;

    if (!API_KEY) {
      console.warn('[CentinelaService] Falta EXPO_PUBLIC_OPENROUTER_API_KEY. Se omite análisis.');
      return null;
    }

    // Contexto reciente desde Zep (resumen + últimos mensajes)
    const zepMemory = await getThreadContext(zepSessionId, 'summary');

    // zepService ya normaliza roles a 'user' | 'assistant' | 'system'
    const historyMessages: { role: 'user' | 'assistant' | 'system'; content: string }[] =
      (zepMemory?.messages ?? []).slice(-10);

    const systemPrompt = [
      'Eres el módulo Centinela de LéNOR.',
      'Detecta señales de: estado emocional crítico; urgencia real; confesiones delicadas o de riesgo;',
      'o información que deba recordarse con prioridad.',
      'Responde SOLO con una inferencia breve si hay algo. Si no, responde exactamente: null',
    ].join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const payload = {
      model: API_MODEL_CENTINELA,
      messages: [
        { role: 'system', content: systemPrompt },
        ...historyMessages,
        { role: 'user', content: texto },
      ],
      temperature: 0,
      max_tokens: 150,
      user: zepSessionId,
    } as const;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error('[CentinelaService] OpenRouter error:', res.status, errorText);
      return null;
    }

    const data = await res.json();
    const inferencia = data?.choices?.[0]?.message?.content?.trim();

    if (inferencia && String(inferencia).toLowerCase() != 'null') {
      await addMessageToThread(zepSessionId, { role: 'assistant', content: `[CENTINELA] ${inferencia}` });
      return inferencia;
    }

    return null;
  } catch (error) {
    console.error('[CentinelaService] Error analizando texto con Centinela:', error);
    return null; // Nunca romper UI
  }
};
