import { networkService } from './networkService';
import { getThreadContext } from './zepService'; // v3: threads/context
import { supabase } from './supabaseClient';

// Estados posibles para los servicios
export type ServiceStatus =
  | 'OK'
  | 'ERROR'
  | 'DEGRADADO'
  | 'NO_DISPONIBLE'
  | 'DESCONECTADO'
  | 'CONECTADO'
  | 'NO_ACTIVA'
  | 'ACTIVA_OK'
  | 'TIMEOUT';

interface ZepLikeError {
  status?: number;
  response?: { status?: number; data?: unknown };
  message?: string;
}

/** Helper: timeout para promesas */
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });

/** Red */
export const checkNetworkStatus = (): ServiceStatus => {
  try {
    return networkService.getCurrentStatus() ? 'CONECTADO' : 'DESCONECTADO';
  } catch (error) {
    console.error('Error en CortexService_checkNetworkStatus:', error);
    return 'ERROR';
  }
};

/** Zep (v3): usa thread.get_user_context (expuesto como getThreadContext) */
export const checkZepStatus = async (threadId: string | null): Promise<ServiceStatus> => {
  if (!threadId) {
    return 'NO_DISPONIBLE'; // se mapeará a NO_ACTIVA/ACTIVA_OK más adelante
  }

  try {
    // v3: mode "basic" devuelve contexto raw similar a v2
    await withTimeout(getThreadContext(threadId, 'basic'), 5000);
    return 'OK';
  } catch (error: unknown) {
    const err = error as ZepLikeError;
    const status = err?.status ?? err?.response?.status;
    const msg = String(err?.message || '');

    // 404 (thread inexistente) = Zep respondió => servicio arriba
    if (status === 404 || msg.includes('404')) return 'OK';

    if (msg === 'TIMEOUT') return 'TIMEOUT';

    console.error(
      `Error en CortexService_checkZepStatus (Thread: ${threadId?.slice(0, 8) || 'N/A'}):`,
      error
    );
    return 'ERROR';
  }
};

/** Supabase */
export const checkSupabaseStatus = async (): Promise<ServiceStatus> => {
  try {
    const { error } = await withTimeout(supabase.auth.getSession(), 3000);
    if (error) {
      console.error('Error en CortexService_checkSupabaseStatus_getSessionError:', error);
      return 'DEGRADADO';
    }
    return 'OK';
  } catch (error) {
    if ((error as Error)?.message === 'TIMEOUT') {
      console.warn('>>> CortexService: Timeout verificando Supabase');
      return 'TIMEOUT';
    }
    console.error('Error en CortexService_checkSupabaseStatus_catch:', error);
    return 'ERROR';
  }
};

/** Cadena amigable para inyectar al prompt */
export const getCortexStatus = async (zepThreadId: string | null): Promise<string> => {
  try {
    const result = await withTimeout(
      (async () => {
        const network = checkNetworkStatus();
        const zep = await checkZepStatus(zepThreadId);
        const supa = await checkSupabaseStatus();

        let zepStatusText: ServiceStatus = zep;
        if (zep === 'OK' && !zepThreadId) zepStatusText = 'NO_ACTIVA';
        else if (zep === 'OK' && zepThreadId) zepStatusText = 'ACTIVA_OK';

        return `ESTADO_SISTEMA: Red: ${network}, MemoriaLargoPlazo(Zep): ${zepStatusText}, BaseDatos(Supabase): ${supa}`;
      })(),
      10000
    );

    return result;
  } catch (error) {
    console.error('>>> CortexService: Error obteniendo estado del sistema:', error);
    return 'ESTADO_SISTEMA: Red: ERROR, MemoriaLargoPlazo(Zep): ERROR, BaseDatos(Supabase): ERROR';
  }
};

/** Objeto estructurado para UI/diagnóstico */
export const getSystemStatusObject = async (
  zepThreadId: string | null
): Promise<{ network: ServiceStatus; zep: ServiceStatus; zepFriendly: string; supabase: ServiceStatus }> => {
  try {
    const result = await withTimeout(
      (async () => {
        const [network, zep, supabaseStatus] = await Promise.all([
          Promise.resolve(checkNetworkStatus()),
          checkZepStatus(zepThreadId),
          checkSupabaseStatus(),
        ]);

        let zepFriendlyText: ServiceStatus | string = zep;
        if (zep === 'OK') {
          zepFriendlyText = zepThreadId ? 'ACTIVA_OK' : 'NO_ACTIVA';
        } else if (zep === 'TIMEOUT') {
          zepFriendlyText = 'TIMEOUT - Reinicia la app';
        }

        return { network, zep, zepFriendly: zepFriendlyText, supabase: supabaseStatus };
      })(),
      8000
    );

    return result;
  } catch (error) {
    const msg = (error as Error)?.message;
    if (msg === 'TIMEOUT') {
      console.warn('>>> CortexService: Timeout global en diagnóstico del sistema');
      return {
        network: 'TIMEOUT',
        zep: 'TIMEOUT',
        zepFriendly: 'TIMEOUT - Reinicia la app',
        supabase: 'TIMEOUT',
      };
    }
    console.error('>>> CortexService: Error crítico en diagnóstico del sistema:', error);
    return { network: 'ERROR', zep: 'ERROR', zepFriendly: 'ERROR - Verifica conexión', supabase: 'ERROR' };
  }
};