export type ZepMessage = { role: 'user' | 'assistant' | 'system'; content: string };

const ZEP_API_KEY = process.env.EXPO_PUBLIC_ZEP_API_KEY || process.env.EXPO_PUBLIC_ZEP;
const ZEP_BASE_URL = (process.env.EXPO_PUBLIC_ZEP_BASE_URL || 'https://api.getzep.com').replace(/\/$/, '');

if (!ZEP_API_KEY) {
  console.error('[zepService] Falta EXPO_PUBLIC_ZEP_API_KEY');
}

const PREFIXES = ['/api/v1', '/v1'];

async function zepFetch(path: string, init?: RequestInit) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ZEP_API_KEY}`,
    ...(init?.headers || {}),
  } as any;

  let lastErr: any = null;
  for (const pref of PREFIXES) {
    const url = `${ZEP_BASE_URL}${pref}${path}`; // path sin prefijo
    try {
      const res = await fetch(url, { ...init, headers });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`[ZEP] ${res.status} ${res.statusText} — ${text}`);
      }
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Crea un Thread si no existe */
export async function createThread(threadId: string): Promise<boolean> {
  if (!threadId) return false;
  try {
    await zepFetch(`/threads`, {
      method: 'POST',
      body: JSON.stringify({ thread_id: threadId, metadata: { app: 'LÉNOR' } }),
    });
    return true;
  } catch (e: any) {
    // 409 = ya existe
    if (String(e?.message || e).includes('409')) return true;
    console.warn('[zepService] createThread:', e?.message || e);
    return false;
  }
}

/** Añade un mensaje a un Thread */
export async function addMessageToThread(threadId: string, message: ZepMessage): Promise<void> {
  const role = (message.role || 'assistant').toLowerCase();
  const normalized: ZepMessage = {
    role: role === 'human' ? 'user' : (role === 'ai' ? 'assistant' : (['user', 'assistant', 'system'].includes(role) ? role as any : 'assistant')),
    content: String(message.content ?? ''),
  };
  await zepFetch(`/threads/${encodeURIComponent(threadId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messages: [normalized] }),
  });
}

/** Obtiene contexto del Thread */
export async function getThreadContext(
  threadId: string,
  mode: 'summary' | 'basic' = 'summary'
): Promise<{ messages: ZepMessage[]; summary?: string } | null> {
  const res = await zepFetch(`/threads/${encodeURIComponent(threadId)}/context?mode=${mode}`, { method: 'GET' });
  const json = await res.json();
  const messages: ZepMessage[] = (json?.messages ?? []).map((m: any) => ({
    role: m.role === 'ai' ? 'assistant' : (m.role === 'human' ? 'user' : m.role),
    content: String(m.content ?? ''),
  }));
  const summary = typeof json?.summary === 'string' ? json.summary : undefined;
  return { messages, summary };
}

/** Elimina todos los mensajes del Thread */
export async function deleteThreadMessages(threadId: string): Promise<boolean> {
  try {
    const res = await zepFetch(`/threads/${encodeURIComponent(threadId)}/messages`, { method: 'DELETE' });
    return (res as any).ok || (res as any).status === 204;
  } catch (e) {
    console.error('[zepService] deleteThreadMessages:', e);
    return false;
  }
}
