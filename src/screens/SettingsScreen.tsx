import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { Container, Header, Card, Button } from '../components';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getSystemStatusObject } from '../services/cortexService';
import LiveStatusBox from '../components/LiveStatusBox';
import { deleteThreadMessages } from '../services/zepService';

interface SystemStatus {
  network: string;
  zep: string;
  zepFriendly: string;
  supabase: string;
}

const SettingsScreen = () => {
  const theme = useTheme();
  const { userPreferences, updatePreferences, zepSessionId } = useAuth();
  
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(userPreferences?.voice_mode_enabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [storageSize, setStorageSize] = useState('Calculando...');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const appVersion = Constants.expoConfig?.version || 'N/A';
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    // Sincronizar estado local si las preferencias del contexto cambian
    setVoiceModeEnabled(userPreferences?.voice_mode_enabled ?? true);
  }, [userPreferences]);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const status = await getSystemStatusObject(zepSessionId || null);
        setSystemStatus(status);
      } catch (error) {
        console.error('Error cargando estado del sistema:', error);
        setSystemStatus(null);
      }
    };
    
    fetchSystemStatus(); // Carga inicial
    const statusInterval = setInterval(fetchSystemStatus, 10000); // Refrescar cada 10s
    return () => clearInterval(statusInterval);
  }, [zepSessionId]);

  useEffect(() => {
    // Calcular tamaño del caché
    const calculateCacheSize = async () => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const values = await AsyncStorage.multiGet(keys);
            let totalSize = 0;
            values.forEach(value => {
                if (value && value[1]) totalSize += value[1].length;
            });
            if (totalSize > 1024 * 1024) setStorageSize(`${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
            else if (totalSize > 1024) setStorageSize(`${(totalSize / 1024).toFixed(2)} KB`);
            else setStorageSize(`${totalSize} bytes`);
        } catch {
            setStorageSize('Error');
        }
    };
    calculateCacheSize();
  }, []);

  const handleVoiceModeToggle = async () => {
    const newValue = !voiceModeEnabled;
    setVoiceModeEnabled(newValue); // Actualización optimista de la UI
    setIsSaving(true);
    try {
      await updatePreferences({ voice_mode_enabled: newValue });
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el ajuste. Inténtalo de nuevo.');
      setVoiceModeEnabled(!newValue); // Revertir en caso de error
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = () => Alert.alert('Limpiar caché local', 'Esta acción no se puede deshacer.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Limpiar', style: 'destructive', onPress: async () => {
    await AsyncStorage.clear();
    setStorageSize('0 bytes');
    Alert.alert('Éxito', 'El caché local ha sido limpiado.');
  }}]);
  
  const handleResetMemory = () => Alert.alert(
    'Borrar Memoria de la Conversación',
    'LéNOR olvidará todo el contexto de esta conversación, pero los mensajes no se borrarán. ¿Continuar?',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sí, borrar memoria', style: 'destructive', onPress: async () => {
        if (!zepSessionId) {
            Alert.alert('Error', 'No hay una sesión de conversación activa.');
            return;
        }
        const success = await deleteThreadMessages(zepSessionId);
        if (success) {
            Alert.alert('Éxito', 'La memoria de la conversación ha sido reiniciada.');
        } else {
            Alert.alert('Error', 'No se pudo borrar la memoria. Inténtalo de nuevo.');
        }
    }}]
  );

  return (
    <Container>
      <Header title="LéNOR 2.0 - Centro de Control" subtitle="Ajustes de la app y del sistema." />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <Card title="Diagnóstico del Sistema" style={styles.card}>
          <LiveStatusBox title="Red" status={systemStatus?.network || null} isLoading={!systemStatus} />
          <LiveStatusBox title="Zep" status={systemStatus?.zepFriendly || null} isLoading={!systemStatus} />
          <LiveStatusBox title="Supabase" status={systemStatus?.supabase || null} isLoading={!systemStatus} />
        </Card>

        <Card title="Ajustes de la App" style={styles.card}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Activar modo voz global</Text>
            {isSaving ? <ActivityIndicator size="small" /> : <Switch value={voiceModeEnabled} onValueChange={handleVoiceModeToggle} trackColor={{ false: theme.colors.background.secondary, true: theme.colors.accent.primary }} thumbColor={theme.colors.background.primary} />}
          </View>
        </Card>

        <Card title="Comandos de Chat" style={styles.card}>
            <Text style={styles.infoText}>Usa estos comandos directamente en el chat para interactuar con la memoria de LéNOR.</Text>
            <View style={styles.commandItem}>
                <Text style={styles.commandText}>Registra en memoria: [tu texto aquí]</Text>
                <Text style={styles.commandDescription}>Guarda o actualiza tu contexto personal en la memoria a largo plazo de LéNOR.</Text>
            </View>
        </Card>

        <Card title="Memoria de Conversación (Zep)" style={styles.card}>
            <Text style={styles.infoText}>Esto reinicia la memoria a corto y largo plazo de Zep para la conversación actual.</Text>
            <View style={styles.buttonContainer}><Button title="Borrar Memoria de Conversación" onPress={handleResetMemory} variant="destructive" /></View>
        </Card>
        
        <Card title="Almacenamiento Local" style={styles.card}>
          <LiveStatusBox title="Uso de Caché Local" status={storageSize} isLoading={storageSize === 'Calculando...'} />
          <View style={styles.buttonContainer}><Button title="Limpiar Caché" onPress={handleClearCache} variant="destructive" /></View>
        </Card>
        
        <View style={styles.versionContainer}><Text style={styles.versionText}>LéNOR App Version: {appVersion}</Text></View>
      </ScrollView>
    </Container>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: { paddingBottom: theme.spacing.lg, padding: theme.spacing.md },
    card: { marginBottom: theme.spacing.md },
    infoText: { color: theme.colors.text.secondary, fontSize: theme.typography.fontSize.md, marginBottom: theme.spacing.md, textAlign: 'center' },
    settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm },
    settingLabel: { color: theme.colors.text.primary, fontSize: theme.typography.fontSize.md },
    commandItem: {
      paddingVertical: theme.spacing.sm,
    },
    commandText: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: 'bold',
      fontFamily: 'monospace',
    },
    commandDescription: {
      color: theme.colors.text.secondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.xs,
    },
    buttonContainer: { alignItems: 'center', marginTop: theme.spacing.md },
    versionContainer: { marginTop: theme.spacing.xl, alignItems: 'center' },
    versionText: { color: theme.colors.text.secondary, fontSize: theme.typography.fontSize.sm },
  });

export default SettingsScreen;