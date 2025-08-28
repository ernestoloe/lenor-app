// src/screens/VoiceModeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Header } from '../components';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts/ThemeContext';
import { AppTheme } from '../types/app';
import { useAuth } from '../contexts/AuthContext';
import { elevenLabsService } from '../services/elevenLabsService';
import { useNavigation } from '@react-navigation/native';
import { Message } from '../types/chat';
import { messageStore } from '../services/messageStore';

enum VoiceModeState {
  Idle = 'IDLE',
  Listening = 'LISTENING',
  Processing = 'PROCESSING',
  GeneratingAudio = 'GENERATING_AUDIO',
  Speaking = 'SPEAKING',
  Error = 'ERROR'
}

const VoiceModeScreen: React.FC = () => {
  const { 
    userPreferences,
    sendMessage,
    zepSessionId,
    isLoading: isAuthLoading,
  } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [voiceState, setVoiceState] = useState<VoiceModeState>(VoiceModeState.Idle);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lastPlayedMessageId = useRef<string | null>(null);
  const isMountedRef = useRef(false);
  const shouldPlayAudioRef = useRef(false);

  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  /** ---- LISTENERS & CLEANUP ---- **/
  useEffect(() => {
    isMountedRef.current = true;
    lastPlayedMessageId.current = null;

    const onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setTranscript(e.value[0]);
      }
    };

    const onSpeechError = (e: SpeechErrorEvent) => {
      if (!isMountedRef.current) return;
      console.error('Voice.onSpeechError:', e.error);
      const noSpeechMessage = "No speech detected";
      if (e.error?.message?.includes(noSpeechMessage)) {
        setError("No te escuché. Toca el ícono para intentarlo de nuevo.");
      } else {
        setError(e.error?.message || 'Error en reconocimiento de voz');
      }
      setVoiceState(VoiceModeState.Idle);
    };

    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechError = onSpeechError;

    return () => {
      isMountedRef.current = false;
      Voice.destroy().catch((e: unknown) => console.error("Error en Voice.destroy en cleanup:", e));
      elevenLabsService.stopPlayback().catch((err: unknown) => console.error("Error deteniendo playback:", err));
    };
  }, []);

  /** ---- ANIMACIÓN DE MIC ---- **/
  useEffect(() => {
    if (voiceState === VoiceModeState.Processing || voiceState === VoiceModeState.Speaking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceState, pulseAnim]);

  /** ---- REPRODUCIR MENSAJES ---- **/
  useEffect(() => {
    const handleNewMessage = (messages: Message[]) => {
      if (!isMountedRef.current || !messages?.length) return;
      if (!shouldPlayAudioRef.current) return;
      
      const lastAIMessage = [...messages].reverse().find(msg => 
        msg && !msg.isUser && msg.id && msg.text && !msg.isTyping && msg.id !== lastPlayedMessageId.current
      );

      if (lastAIMessage) {
        shouldPlayAudioRef.current = false;
        if (!isMountedRef.current) return;
        setVoiceState(VoiceModeState.GeneratingAudio);
        lastPlayedMessageId.current = lastAIMessage.id;

        // API de callbacks del servicio: onStart, onFinish, onError
        elevenLabsService.streamTextToSpeech(
          lastAIMessage.text,
          () => { if (isMountedRef.current) setVoiceState(VoiceModeState.Speaking) },
          () => {
            if (isMountedRef.current) {
              setVoiceState(VoiceModeState.Idle);
              setError(null);
            }
          },
          (err: unknown) => {
            if (isMountedRef.current) {
              console.error("Error en reproducción de audio:", err);
              setError('Error al reproducir la respuesta.');
              setVoiceState(VoiceModeState.Error);
              setTimeout(() => {
                if (isMountedRef.current) {
                  setError(null);
                  setVoiceState(VoiceModeState.Idle);
                }
              }, 3000);
            }
          }
        );
      } else {
        if (voiceStateRef.current === VoiceModeState.Processing && isMountedRef.current) {
          setVoiceState(VoiceModeState.Idle);
        }
      }
    };

    const unsubscribe = messageStore.subscribe('update', handleNewMessage);
    return () => unsubscribe();
  }, []);

  /** ---- PERMISOS ---- **/
  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      const permission = await Audio.requestPermissionsAsync();
      return permission.status === 'granted';
    }
  };

  /** ---- FUNCIONES PRINCIPALES ---- **/
  const startListening = async () => {
    if (!zepSessionId) {
      setError('Error interno: No se pudo obtener la sesión.');
      setVoiceState(VoiceModeState.Idle);
      return;
    }
    // corta cualquier audio activo antes de escuchar
    try { await elevenLabsService.stopPlayback(); } catch {}

    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      setError('Permiso de micrófono denegado.');
      setVoiceState(VoiceModeState.Idle);
      return;
    }
    try {
      setVoiceState(VoiceModeState.Listening);
      setError(null);
      setTranscript('');
      const locale = userPreferences?.voice_locale || 'es-MX';
      await Voice.start(locale);
    } catch (e) {
      console.error('Error al iniciar Voice.start', e);
      setError('No se pudo iniciar el reconocimiento de voz.');
      setVoiceState(VoiceModeState.Idle);
    }
  };

  const stopListeningAndProcess = async () => {
    try {
      setVoiceState(VoiceModeState.Processing);
      await Voice.stop();
      const currentTranscript = transcript.trim(); 
      setTranscript('');

      if (!currentTranscript) {
        setVoiceState(VoiceModeState.Idle);
        return;
      }

      shouldPlayAudioRef.current = true;
      await sendMessage(currentTranscript, null, 'Voz');
    } catch (e) {
      console.error('Error en stopListeningAndProcess', e);
      setError('Error al detener la escucha');
      setVoiceState(VoiceModeState.Error);
      setTimeout(() => {
        if (isMountedRef.current) setVoiceState(VoiceModeState.Idle);
      }, 2000);
    }
  };

  const exitVoiceMode = async () => {
    try {
      if (voiceState === VoiceModeState.Listening) {
        await Voice.stop(); 
      }
      await Voice.destroy();
      await elevenLabsService.stopPlayback();
    } catch (e) {
      console.error("Error al limpiar recursos al salir del modo voz:", e);
    } finally {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Chat' as never); 
      }
    }
  };

  /** ---- Repetir último audio ---- **/
  const handleReplay = async () => {
    try {
      await elevenLabsService.replayLast(() => {
        setError('No hay audio previo para repetir.');
      });
    } catch {
      setError('No hay audio previo para repetir.');
    }
  };

  /** ---- UI HELPERS ---- **/
  const getTintColor = () => {
    switch (voiceState) {
      case VoiceModeState.Listening:   return '#4CAF50';
      case VoiceModeState.Processing:  return '#FFC107';
      case VoiceModeState.Speaking:    return '#2196F3';
      default:                         return theme.colors.text.secondary;
    }
  };

  const getLabel = () => {
    switch (voiceState) {
      case VoiceModeState.Listening:  return 'Escuchando... Pulsa para enviar';
      case VoiceModeState.Processing: return 'LéNOR está pensando...';
      case VoiceModeState.GeneratingAudio: return 'Generando audio...';
      case VoiceModeState.Speaking:   return 'LéNOR está hablando...';
      default:                        return 'Toca el ícono para hablar';
    }
  };

  const handlePress = voiceState === VoiceModeState.Listening ? stopListeningAndProcess : startListening;

  return (
    <View style={styles.safeArea}>
      <Header title="LéNOR 2.0 - Voz" subtitle="Habla con LéNOR" onLeftPress={exitVoiceMode} leftIcon="close" />
      <View style={styles.mainContent}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.micContainer}>
          <TouchableOpacity
            style={styles.pulsatingMicButton}
            onPress={handlePress}
            disabled={voiceState === VoiceModeState.Processing || voiceState === VoiceModeState.Speaking || isAuthLoading}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="mic-outline" size={100} color={getTintColor()} />
            </Animated.View>
          </TouchableOpacity>
          <Text style={styles.micText}>{getLabel()}</Text>

          {/* Botón Repetir */}
          {elevenLabsService.lastFilePath && (
            <TouchableOpacity style={styles.replayButton} onPress={handleReplay}>
              <Ionicons name="refresh-circle-outline" size={50} color={theme.colors.text.primary} />
              <Text style={styles.replayText}>Repetir</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.transcript}>{transcript}</Text>
      </View>
    </View>
  );
};

/* eslint-disable react-native/no-unused-styles */
const createStyles = (theme: AppTheme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  pulsatingMicButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.ui.divider,
  },
  micText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    textAlign: 'center',
  },
  transcript: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.status.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
  },
  replayButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  replayText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
  },
});
/* eslint-enable react-native/no-unused-styles */

export default VoiceModeScreen;
