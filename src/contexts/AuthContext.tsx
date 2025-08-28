import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { generateMessageId } from '../utils/id';

import { supabase } from '../services/supabaseClient';
import { User, UserPreferences } from '../types/user';
import {
  getOrCreateProfile,
  getUserPreferencesAndNotes,
  updateUserPreferences,
  uploadImage,
  getOrCreateLatestConversation,
  createNewConversation,
} from '../services/userProfileService';

import { addMessageToThread, createThread } from '../services/zepService';
import { Message } from '../types/chat';
import { messageStore } from '../services/messageStore';
import { sendMessageToAI, AIMessage } from '../services/aiService';

// Usa solo los alias para cuadrar Promise<void> en el provider
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
} from '../services/authService';

const AI_ID = 'ai-lenor';
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  voice_locale: 'es-MX',
  voice_mode_enabled: true,
};

interface AuthContextType {
  user: User | null;
  userPreferences: UserPreferences | null;
  messages: Message[];
  zepSessionId: string | null;
  currentConversationId: string | null;
  isLoading: boolean;
  isUserLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  startNewChat: () => Promise<void>;
  sendMessage: (messageText: string, localImageUri?: string | null, inputMode?: string) => Promise<boolean>;
  setCurrentConversationId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [zepSessionId, setZepSessionId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUserLoading, setIsUserLoading] = useState<boolean>(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          processUserSession(session);
        } else {
          setUser(null);
          setUserPreferences(null);
          setZepSessionId(null);
          setCurrentConversationId(null);
          messageStore.reset('');
        }
      });
      return () => {
        authListener.subscription?.unsubscribe?.();
      };
    };
    initializeAuth();
  }, []);

  const processUserSession = async (session: Session) => {
    try {
      const userEmail = session.user.email;
      if (!userEmail) throw new Error("No se encontró un email en la sesión de usuario.");

      // Perfil
      const profile = await getOrCreateProfile(session.user.id, userEmail);
      const currentUserData: User = {
        id: session.user.id,
        email: userEmail,
        name: profile.name || userEmail.split('@')[0] || 'Usuario',
      };
      setUser(currentUserData);
      messageStore.setCurrentUser(session.user.id);

      // Preferencias y notas
      const prefResp = await getUserPreferencesAndNotes(session.user.id);
      setUserPreferences(prefResp?.preferences ?? DEFAULT_USER_PREFERENCES);

      // Conversación activa
      const latest = await getOrCreateLatestConversation(session.user.id);
      setCurrentConversationId(latest.id);
      setZepSessionId(latest.zep_session_id);
      messageStore.setCurrentConversation(latest.id);

      // Garantiza thread en Zep (no bloquea UI)
      createThread(latest.zep_session_id).catch((e) =>
        console.warn('[AuthContext] createThread:', e?.message || e)
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la sesión de usuario.');
    }
  };

  const handleSetCurrentConversationId = (id: string | null) => {
    setCurrentConversationId(id);
  };

  const handleStartNewChat = async () => {
    if (!user?.id) return;
    setIsUserLoading(true);
    try {
      const newConversation = await createNewConversation(user.id);
      setCurrentConversationId(newConversation.id);
      setZepSessionId(newConversation.zep_session_id);
      messageStore.setCurrentConversation(newConversation.id);
      // Crea thread en Zep
      createThread(newConversation.zep_session_id).catch((e) =>
        console.warn('[AuthContext] createThread:', e?.message || e)
      );
    } catch {
      Alert.alert('Error', 'No se pudo iniciar un nuevo chat.');
    } finally {
      setIsUserLoading(false);
    }
  };

  const sendMessage = async (messageText: string, localImageUri?: string | null, inputMode?: string): Promise<boolean> => {
    setIsUserLoading(true);

    if (!user?.id || !zepSessionId || !currentConversationId) {
      Alert.alert('Error de Sesión', 'No se pudo enviar el mensaje. Por favor, reinicia la aplicación.');
      setIsUserLoading(false);
      return false;
    }

    let provisionalId: string | null = null;

    try {
      let imageUrl: string | null = null;
      if (localImageUri) {
        try {
          imageUrl = await uploadImage(localImageUri);
        } catch (uploadError) {
          console.error('AuthContext.handleImageUpload:', uploadError);
          setIsUserLoading(false);
          return false;
        }
      }

      const userMessage: AIMessage & { conversationId: string } = {
        id: generateMessageId(user.id),
        text: messageText,
        isUser: true,
        timestamp: new Date().toISOString(),
        senderId: user.id,
        role: 'user',
        imageUrl: imageUrl ?? undefined,
        conversationId: currentConversationId,
      };

      messageStore.addMessage(userMessage);

      provisionalId = generateMessageId(AI_ID);
      messageStore.addMessage({
        id: provisionalId,
        text: '…',
        isUser: false,
        timestamp: new Date().toISOString(),
        senderId: AI_ID,
        role: 'assistant',
        conversationId: currentConversationId,
        isTyping: true,
      } as any);

      const fullResponseText = await sendMessageToAI(
        userMessage,
        userPreferences,
        zepSessionId,
        null, // explicitMemoryNotes
        user,
        currentConversationId,
        inputMode
      );

      if (fullResponseText) {
        messageStore.updateMessage(provisionalId, {
          text: fullResponseText,
          isTyping: false,
          timestamp: new Date().toISOString(),
        } as any);
        await addMessageToThread(
          zepSessionId,
          { role: 'user', content: imageUrl ? `${messageText}\n[image]: ${imageUrl}` : messageText }
        );
        return true;
      } else {
        messageStore.updateMessage(provisionalId, {
          text: 'Hubo un error al procesar tu solicitud.',
          isTyping: false,
          status: 'error',
          timestamp: new Date().toISOString(),
        } as any);
        return false;
      }
    } catch (error) {
      console.error('>>> AuthContext.sendMessage: Error al enviar mensaje:', error);
      if (provisionalId) {
        messageStore.updateMessage(provisionalId, {
          text: 'Hubo un error al procesar tu solicitud.',
          isTyping: false,
          status: 'error',
          timestamp: new Date().toISOString(),
        } as any);
      }
      return false;
    } finally {
      setIsUserLoading(false);
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    setIsUserLoading(true);
    try {
      await updateUserPreferences(user!.id, newPrefs);
      setUserPreferences((prev) => ({ ...prev, ...newPrefs } as UserPreferences));
    } catch (error) {
      console.error('Error al actualizar preferencias:', error);
    } finally {
      setIsUserLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    userPreferences,
    messages,
    zepSessionId,
    currentConversationId,
    isLoading,
    isUserLoading,
    signIn: async (email, password) => { await authSignIn(email, password); },
    signUp: async (email, password) => { await authSignUp(email, password); },
    signOut: async () => { await authSignOut(); },
    updatePreferences,
    startNewChat: handleStartNewChat,
    sendMessage,
    setCurrentConversationId: handleSetCurrentConversationId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
