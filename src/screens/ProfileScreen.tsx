import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Container, Header, Card, Button } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { UserPreferences } from '../types/user';
import { useTheme } from '../contexts/ThemeContext';
import { AppTheme } from '../types/app';

const ProfileScreen = () => {
  const { 
    user, 
    userPreferences, 
    updatePreferences, 
    signOut,
    isLoading: authLoading 
  } = useAuth();
  
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const [localPreferences, setLocalPreferences] = useState<Partial<UserPreferences>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (userPreferences) {
      setLocalPreferences(userPreferences);
    }
  }, [userPreferences]);

  const handleSetLocale = (locale: string) => {
    setLocalPreferences(prev => ({ ...prev, voice_locale: locale }));
  };

  const savePreferences = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updatePreferences(localPreferences);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'No se pudieron guardar tus preferencias.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar tu sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Cerrar Sesión", style: "destructive", onPress: signOut },
      ]
    );
  };

  if (authLoading || !user) {
    return (
      <Container>
        <Header title="LéNOR 2.0 - Tu Perfil" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <Header title="LéNOR 2.0 - Tu Perfil" subtitle="Gestiona tu cuenta y preferencias" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card title="Información de la Cuenta" style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre:</Text>
            <Text style={styles.infoValue}>{user.name || 'No establecido'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </Card>

        <Card title="Preferencias de LéNOR" style={styles.card}>
          <Text style={styles.preferenceTitle}>Idioma de la Voz</Text>
          
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceQuestion}>Español (MX)</Text>
            <Switch
              value={localPreferences.voice_locale === 'es-MX'}
              onValueChange={() => handleSetLocale('es-MX')}
              trackColor={{ false: theme.colors.ui.button.secondary, true: theme.colors.accent.tertiary }}
              thumbColor={localPreferences.voice_locale === 'es-MX' ? theme.colors.accent.primary : theme.colors.text.secondary}
            />
          </View>

          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceQuestion}>Inglés (US)</Text>
            <Switch
              value={localPreferences.voice_locale === 'en-US'}
              onValueChange={() => handleSetLocale('en-US')}
              trackColor={{ false: theme.colors.ui.button.secondary, true: theme.colors.accent.tertiary }}
              thumbColor={localPreferences.voice_locale === 'en-US' ? theme.colors.accent.primary : theme.colors.text.secondary}
            />
          </View>

          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceQuestion}>Portugués (BR)</Text>
            <Switch
              value={localPreferences.voice_locale === 'pt-BR'}
              onValueChange={() => handleSetLocale('pt-BR')}
              trackColor={{ false: theme.colors.ui.button.secondary, true: theme.colors.accent.tertiary }}
              thumbColor={localPreferences.voice_locale === 'pt-BR' ? theme.colors.accent.primary : theme.colors.text.secondary}
            />
          </View>
          
          <Button
            title={isSaving ? "Guardando..." : saveSuccess ? "Guardado ✓" : "Guardar Preferencias"}
            onPress={savePreferences}
            variant="primary"
            fullWidth
            disabled={isSaving}
            style={{ marginTop: 20 }}
          />
        </Card>

        <View style={styles.signOutContainer}>
          <Button
            title="Cerrar Sesión"
            onPress={handleSignOut}
            variant="destructive"
            fullWidth
          />
        </View>
      </ScrollView>
    </Container>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.divider,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.divider,
  },
  preferenceTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  preferenceQuestion: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    flex: 1,
  },
  signOutContainer: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  }
});

export default ProfileScreen;
