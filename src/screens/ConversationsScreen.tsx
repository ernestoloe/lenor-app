import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Header, Button } from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { getUserConversations } from '../services/userProfileService';

interface ConversationItem {
  id: string;
  zep_session_id: string;
  title: string | null;
  created_at: string;
}

const ConversationsScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { user, zepSessionId, startNewChat, setCurrentConversationId } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    
    try {
      const convIds = await getUserConversations(user.id);
      setConversations(convIds);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      Alert.alert('Error', 'No se pudieron cargar las conversaciones.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    navigation.navigate('Chat' as never);
  };

  const handleNewConversation = async () => {
    try {
      await startNewChat();
      navigation.navigate('Chat' as never);
    } catch (error) {
      console.error('Error creando nueva conversación:', error);
      Alert.alert('Error', 'No se pudo crear una nueva conversación');
    }
  };

  const renderItem = ({ item }: { item: ConversationItem }) => (
    <TouchableOpacity style={styles.conversationItem} onPress={() => handleSelectConversation(item.id)}>
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubbles-outline" size={24} color={theme.colors.accent.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.conversationTitle}>{item.title || 'Conversación'}</Text>
        <Text style={styles.conversationId} numberOfLines={1}>
          Iniciada: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.safeArea}>
      <Header title="LéNOR 2.0 - Conversaciones" subtitle="Retoma una conversación pasada" />
      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No se encontraron conversaciones.</Text>
                <Text style={styles.emptySubText}>Inicia una nueva para verla aquí.</Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={loadConversations}
                tintColor={theme.colors.accent.primary}
              />
            }
          />
        )}
        <View style={styles.newChatButtonContainer}>
          <Button
            title="Iniciar Nueva Conversación"
            onPress={handleNewConversation}
            variant="primary"
            fullWidth
          />
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background.primary },
    container: { flex: 1, padding: theme.spacing.md },
    conversationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.md,
    },
    iconContainer: {
        marginRight: theme.spacing.md,
    },
    textContainer: {
        flex: 1,
    },
    conversationTitle: {
        color: theme.colors.text.primary,
        fontSize: theme.typography.fontSize.md,
        fontWeight: 'bold',
    },
    conversationId: {
        color: theme.colors.text.secondary,
        fontSize: theme.typography.fontSize.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: theme.colors.text.primary,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: 'bold',
    },
    emptySubText: {
        color: theme.colors.text.secondary,
        fontSize: theme.typography.fontSize.md,
        marginTop: theme.spacing.sm,
    },
    newChatButtonContainer: {
        padding: theme.spacing.md,
    },
});

export default ConversationsScreen; 