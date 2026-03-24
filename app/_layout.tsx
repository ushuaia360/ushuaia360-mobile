import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import SearchPanel from '@/components/home/search-panel';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

  // Restaurar sesión guardada en AsyncStorage (sin redirigir)
  useEffect(() => {
    initialize();
  }, []);

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
        </Stack>
        <StatusBar style="auto" />
        <SearchPanel />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
