import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';

export default function VerifyScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#121212' : '#fff';

  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const raw = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const token = raw?.trim() ?? '';

  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const [phase, setPhase] = useState<'loading' | 'ok' | 'err'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setPhase('err');
      setMessage('Este enlace no es válido.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await verifyEmail(token);
        if (cancelled) return;
        setPhase('ok');
        setMessage(res.message || 'Tu cuenta fue verificada.');
      } catch (err) {
        if (cancelled) return;
        setPhase('err');
        setMessage(err instanceof Error ? err.message : 'No pudimos verificar tu cuenta.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail]);

  return (
    <View style={[styles.screen, { paddingTop: top + 20, backgroundColor: bg }]}>
      <TouchableOpacity
        style={[
          styles.backBtn,
          {
            backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
            borderColor: isDark ? '#2a2a2a' : '#ebebeb',
          },
        ]}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        {phase === 'loading' && (
          <ActivityIndicator size="large" color={colors.tint} style={{ marginBottom: 20 }} />
        )}
        {phase === 'ok' && (
          <Ionicons name="checkmark-circle" size={64} color="#34c759" style={{ marginBottom: 16 }} />
        )}
        {phase === 'err' && (
          <Ionicons name="close-circle" size={64} color="#ff3b30" style={{ marginBottom: 16 }} />
        )}

        <ThemedText style={[styles.title, { color: colors.text }]}>
          {phase === 'loading' && 'Verificando…'}
          {phase === 'ok' && 'Cuenta verificada'}
          {phase === 'err' && 'Algo salió mal'}
        </ThemedText>
        <ThemedText style={[styles.body, { color: colors.icon }]}>{message}</ThemedText>

        {phase !== 'loading' && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.replace('/login')}
            activeOpacity={0.85}>
            <ThemedText style={styles.primaryBtnText}>Ir a iniciar sesión</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    marginTop: 28,
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
