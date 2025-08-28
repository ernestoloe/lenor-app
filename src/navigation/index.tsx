import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

import AuthScreen from '../screens/AuthScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VoiceModeScreen from '../screens/VoiceModeScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import type { RootTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const MainTabs = () => {
  const theme = useTheme();
  const c = (theme as any)?.colors || {};

  const active = c?.accent?.primary ?? '#007AFF';
  const inactive = c?.text?.secondary ?? '#8E8E93';
  const bg = c?.background?.secondary ?? '#F6F6F6';
  const border = c?.ui?.divider ?? '#E5E5EA';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'ellipse-outline';
          switch (route.name) {
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'VoiceMode':
              iconName = focused ? 'mic' : 'mic-outline';
              break;
            case 'Conversations':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: border,
        },
      })}
    >
      <Tab.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{ title: 'Conversaciones 2.0', tabBarLabel: 'Conversaciones' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat 2.0', tabBarLabel: 'Chat' }}
      />
      <Tab.Screen
        name="VoiceMode"
        component={VoiceModeScreen}
        options={{ title: 'Modo Voz 2.0', tabBarLabel: 'Modo Voz' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil 2.0', tabBarLabel: 'Perfil' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Ajustes 2.0', tabBarLabel: 'Ajustes' }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const theme = useTheme();
  const c = (theme as any)?.colors || {};

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c?.background?.primary ?? '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={c?.accent?.primary ?? '#007AFF'} />
        <Text style={[styles.loadingText, { color: c?.text?.primary ?? '#111111' }]}>Verificando sesión...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c?.background?.primary ?? '#FFFFFF' },
        }}
      >
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
});