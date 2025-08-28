import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppThemeProvider as ThemeProvider } from './src/contexts/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';
import { messageStore } from './src/services/messageStore';
import { networkService } from './src/services/networkService';
import { GlobalErrorBoundary } from './src/components';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Alert, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getActiveAnnouncementsFromDB } from './src/services/appDataService';

// Mantener la pantalla de splash visible mientras cargamos recursos
SplashScreen.preventAutoHideAsync();

const AppContent = () => {
  const [fontsLoaded, fontError] = useFonts({
    'Roboto-Thin': require('./assets/fonts/static/Roboto-Thin.ttf'),
    'Roboto-ThinItalic': require('./assets/fonts/static/Roboto-ThinItalic.ttf'),
    'Roboto-Light': require('./assets/fonts/static/Roboto-Light.ttf'),
    'Roboto-LightItalic': require('./assets/fonts/static/Roboto-LightItalic.ttf'),
    'Roboto-Regular': require('./assets/fonts/static/Roboto-Regular.ttf'),
    'Roboto-Italic': require('./assets/fonts/static/Roboto-Italic.ttf'),
    'Roboto-Medium': require('./assets/fonts/static/Roboto-Medium.ttf'),
    'Roboto-MediumItalic': require('./assets/fonts/static/Roboto-MediumItalic.ttf'),
    'Roboto-Bold': require('./assets/fonts/static/Roboto-Bold.ttf'),
    'Roboto-BoldItalic': require('./assets/fonts/static/Roboto-BoldItalic.ttf'),
    'Roboto-Black': require('./assets/fonts/static/Roboto-Black.ttf'),
    'Roboto-BlackItalic': require('./assets/fonts/static/Roboto-BlackItalic.ttf'),
  });

  // El splash se oculta en el componente App principal ahora
  React.useEffect(() => {
    if (fontError) {
      console.error('🔥 ERROR CARGANDO FUENTES:', fontError);
    }
    if ((fontsLoaded || fontError)) {
      // ya no se hace nada aquí
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <RootNavigator />
  );
};

const App = () => {
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('>>> App.tsx: Initializing services...');
        networkService.initialize();
        messageStore.initialize();
        console.log('>>> App.tsx: Services initialized.');
        // Aquí se podrían precargar más cosas si fuera necesario
      } catch (e) {
        console.warn(e);
      } finally {
        // Le decimos a la app que ya está lista para renderizar
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // Mostrar anuncios solo cuando la app esté lista.
      getActiveAnnouncementsFromDB().then(announcements => {
        if (announcements && announcements.length > 0) {
          announcements.forEach(announcement => {
            Alert.alert("Anuncio", announcement.message);
          });
        }
      });
    }
  }, [appIsReady]);

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      // Esto oculta la pantalla de splash. Asegurándonos que la UI
      // esté lista para ser mostrada.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <GlobalErrorBoundary>
            <ThemeProvider>
              <AuthProvider>
                <StatusBar style="auto" />
                <AppContent />
              </AuthProvider>
            </ThemeProvider>
          </GlobalErrorBoundary>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;