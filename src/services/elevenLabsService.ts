// src/services/elevenLabsService.ts
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

type OnStart = () => void;
type OnFinish = () => void;
type OnError = (err: unknown) => void;

class ElevenLabsService {
  private sound: Audio.Sound | null = null;
  private abortController: AbortController | null = null;
  public lastFilePath: string | null = null;

  // ---- util: base64 sin Buffer/btoa (RN/Expo)
  private toBase64(bytes: Uint8Array): string {
    const b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const a = bytes[i] ?? 0, b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
      const t = (a << 16) | (b << 8) | c;
      out += b64[(t >> 18) & 63] + b64[(t >> 12) & 63] + b64[(t >> 6) & 63] + b64[t & 63];
    }
    const mod = bytes.length % 3;
    if (mod) out = out.slice(0, mod === 1 ? -2 : -1) + '=='.slice(mod - 1);
    return out;
  }

  private async playFromFile(fileUri: string, onStart?: OnStart) {
    // corta cualquier audio previo
    if (this.sound) {
      try { await this.sound.stopAsync(); } catch {}
      try { await this.sound.unloadAsync(); } catch {}
      this.sound = null;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
    this.sound = sound;
    onStart?.();
  }

  /**
   * Genera audio (AAC) con ElevenLabs y reproduce.
   * Firma compatible con tu pantalla: (text, onStart, onFinish, onError)
   */
  async streamTextToSpeech(
    text: string,
    onStart?: OnStart,
    onFinish?: OnFinish,
    onError?: OnError
  ) {
    await this.stopPlayback();
    this.abortController = new AbortController();

    try {
      const voiceId = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID as string;
      const apiKey  = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY as string;
      if (!voiceId || !apiKey) throw new Error('ELEVENLABS: faltan variables de entorno');

      // No-stream (más estable en Expo). AAC + Flash v2.5 (lo más barato).
      const qs = new URLSearchParams({ output_format: 'aac_44100_128' });
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?${qs.toString()}`;

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado en ElevenLabs')), 15000)
      );

      const resp = await Promise.race([
        fetch(url, {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'accept': 'audio/aac',
          },
          body: JSON.stringify({
            model_id: 'eleven_flash_v2_5',
            text,
          }),
          signal: this.abortController.signal,
        }),
        timeout
      ]) as Response;

      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`ELEVENLABS ${resp.status}: ${t}`);
      }

      const arrayBuf = await resp.arrayBuffer();
      const base64 = this.toBase64(new Uint8Array(arrayBuf));
      const filePath = `${FileSystem.cacheDirectory}lenor_last_audio.aac`;
      await FileSystem.writeAsStringAsync(filePath, base64, { encoding: FileSystem.EncodingType.Base64 });

      this.lastFilePath = filePath;
      await this.playFromFile(filePath, onStart);

      // marca finish cuando termine realmente
      this.sound?.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          try { await this.sound?.unloadAsync(); } catch {}
          this.sound = null;
          onFinish?.();
        }
      });

    } catch (err) {
      onError?.(err);
      // no relanza para que tu UI maneje el estado; si quieres, descomenta:
      // throw err;
    }
  }

  async replayLast(onError?: OnError) {
    try {
      if (!this.lastFilePath) throw new Error('No hay audio previo para reproducir.');
      await this.playFromFile(this.lastFilePath);
    } catch (e) {
      onError?.(e);
    }
  }

  async stopPlayback() {
    try {
      if (this.sound) {
        try { await this.sound.stopAsync(); } catch {}
        try { await this.sound.unloadAsync(); } catch {}
        this.sound = null;
      }
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
    } catch (err) {
      // swallow
    }
  }

  cancelRequest() {
    if (this.abortController) this.abortController.abort();
  }
}

export const elevenLabsService = new ElevenLabsService();
