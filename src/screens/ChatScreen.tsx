import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, MessageBubble } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { messageStore } from '../services/messageStore';
import { uploadImageToSupabase } from '../services/imageService';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';
import type { AppTheme } from '../types/app';
import type { Message } from '../types/chat';

const NEAR_BOTTOM_OFFSET = 120;

type Props = BottomTabScreenProps<RootTabParamList, 'Chat'>;

const toStr = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim() ? v : fallback;

const tsOf = (m: Pick<Message, 'timestamp'>): number => {
  const raw = m.timestamp as unknown;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

const ChatScreen: React.FC<Props> = ({ route }) => {
  const conversationId = route.params?.conversationId;
  const { sendMessage, isLoading: isAuthLoading } = useAuth();
  const theme = useTheme() as AppTheme;
  const insets = useSafeAreaInsets();

  // Solo usamos claves reales del tema; primario/borde locales
const BG      = theme.colors?.background?.primary ?? '#FFFFFF';
const TEXT    = theme.colors?.text?.primary       ?? '#222222';
const PRIMARY = theme.colors?.accent?.primary     ?? '#007AFF';
const BORDER  = theme.colors?.ui?.divider         ?? '#DDDDDD';

  const styles = useMemo(() => createStyles({ BG, TEXT, PRIMARY, BORDER }), [BG, TEXT]);

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const handleStoreUpdate = () => {
      const all = messageStore.getMessages();
      const filtered = conversationId
        ? all.filter((m) => m.conversationId === conversationId)
        : all;
      setLocalMessages(safeSort(filtered));
    };
    handleStoreUpdate();
    const unsubscribe = messageStore.subscribe('update', handleStoreUpdate);
    return () => unsubscribe();
  }, [conversationId]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setAutoScroll(distanceFromBottom < NEAR_BOTTOM_OFFSET);
  }, []);

  const onContentSizeChange = useCallback(() => {
    if (autoScroll) {
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    }
  }, [autoScroll]);

  const handleSendMessage = useCallback(async () => {
    if ((!inputText.trim() && !selectedImageUri) || isSending || isAuthLoading) return;
    setIsSending(true);
    try {
      await sendMessage(inputText, selectedImageUri, 'Texto');
      setInputText('');
      setSelectedImageUri(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error al enviar el mensaje.';
      Alert.alert('Error', errorMessage);
      console.error('SendMessage Error:', error);
    } finally {
      setIsSending(false);
    }
  }, [inputText, selectedImageUri, isSending, isAuthLoading, sendMessage]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const publicUrl = await uploadImageToSupabase(selectedAsset.uri);
        setSelectedImageUri(publicUrl);
      }
    } catch (e) {
      console.error('Error al subir la imagen:', e);
      Alert.alert('Error', 'No se pudo subir la imagen. Intenta de nuevo.');
    }
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble messageObject={item} key={item.id} />
  ), []);

  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Inicia una conversación con LéNOR.</Text>
    </View>
  ), [styles]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Chat" />

      <FlatList
        ref={flatListRef}
        data={localMessages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContent}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        keyboardShouldPersistTaps="handled"
      />

      {selectedImageUri && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: selectedImageUri }} style={styles.image} />
          <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImageUri(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
          <Ionicons name="image-outline" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje"
            placeholderTextColor={`${TEXT}88`}
            multiline
          />
        </View>
        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={isSending || isAuthLoading}
          style={[styles.sendBtn, (isSending || isAuthLoading) && styles.sendBtnDisabled]}
        >
          {isSending || isAuthLoading ? (
            <ActivityIndicator />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const safeSort = (messages: Message[]) =>
  [...messages].sort((a, b) => (tsOf(a) - tsOf(b)) || a.id.localeCompare(b.id));

interface Styles {
  container: ViewStyle;
  listContent: ViewStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  inputBar: ViewStyle;
  iconBtn: ViewStyle;
  inputContainer: ViewStyle;
  input: TextStyle;
  sendBtn: ViewStyle;
  sendBtnDisabled: ViewStyle;
  imagePreview: ViewStyle;
  image: ImageStyle;
  removeImageBtn: ViewStyle;
}

function createStyles(colors: { BG: string; TEXT: string; PRIMARY: string; BORDER: string }) {
  const { BG, TEXT, PRIMARY, BORDER } = colors;
  return StyleSheet.create<Styles>({
    container: { flex: 1, backgroundColor: BG },
    listContent: { paddingBottom: 96 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { opacity: 0.6, color: TEXT },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: BORDER,
      backgroundColor: BG,
    },
    iconBtn: { padding: 6, marginRight: 6 },
    inputContainer: {
      flex: 1,
      minHeight: 40,
      maxHeight: 120,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: BORDER,
      borderRadius: 12,
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    input: {
      fontSize: 16,
      color: TEXT,
      backgroundColor: 'transparent',
    },
    sendBtn: {
      marginLeft: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: PRIMARY,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
    imagePreview: {
      position: 'absolute',
      right: 16,
      bottom: 72,
      borderRadius: 8,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
      backgroundColor: BG,
    },
    image: { width: 120, height: 90 },
    removeImageBtn: {
      position: 'absolute',
      right: 4,
      top: 4,
      backgroundColor: '#0008',
      borderRadius: 10,
      padding: 2,
    },
  });
}

export default ChatScreen;