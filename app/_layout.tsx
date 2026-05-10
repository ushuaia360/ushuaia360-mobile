import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import SearchPanel from '@/components/home/search-panel';
import PendingTrailCompletionSync from '@/components/pending-trail-completion-sync';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useActiveTrailSessionStore } from '@/store/active-trail-session-store';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize } = useAuthStore();
  const token = useAuthStore((s) => s.token);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const loadFavoriteIds = useFavoritesStore((s) => s.loadIds);
  const clearFavorites = useFavoritesStore((s) => s.clear);
  const hydrateActiveTrailSession = useActiveTrailSessionStore((s) => s.hydrate);

  // Restaurar sesión guardada en AsyncStorage (sin redirigir)
  useEffect(() => {
    initialize();
  }, []);

  /** En web, precarga pickers para no perder user gesture tras `await import`. */
  useEffect(() => {
    if (Platform.OS === 'web') {
      void import('expo-image-picker');
      void import('expo-document-picker');
    }
  }, []);

  useEffect(() => {
    void hydrateActiveTrailSession();
  }, [hydrateActiveTrailSession]);

  useEffect(() => {
    if (!isInitialized) return;
    if (token) {
      loadFavoriteIds(token);
    } else {
      clearFavorites();
    }
  }, [isInitialized, token, loadFavoriteIds, clearFavorites]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="trails/[id]" options={{ headerShown: true }} />
          <Stack.Screen name="places/[id]" options={{ headerShown: true }} />
          <Stack.Screen name="login" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="register" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="verify" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false, presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
        <PendingTrailCompletionSync />
        <SearchPanel />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
