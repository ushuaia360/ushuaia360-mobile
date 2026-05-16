import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#121212' : '#fff';
  const inputBg = isDark ? '#1c1c1e' : '#fff';
  const borderColor = isDark ? '#2a2a2a' : '#ebebeb';

  const { forgotPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');

  const submit = async () => {
    const e = email.trim();
    if (!e) {
      Alert.alert(t('common.error'), t('auth.forgotPasswordScreen.enterEmail'));
      return;
    }
    try {
      const res = await forgotPassword(e);
      Alert.alert(t('common.ok'), res.message || t('auth.forgotPasswordScreen.success'), [
        { text: t('common.ok'), onPress: () => router.replace('/login') },
      ]);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('auth.forgotPasswordScreen.sendError'));
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: top + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: inputBg, borderColor }]}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <ThemedText style={[styles.title, { color: colors.text }]}>{t('auth.forgotPasswordScreen.title')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {t('auth.forgotPasswordScreen.subtitle')}
          </ThemedText>

          <View style={[styles.field, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="mail-outline" size={18} color={colors.icon} />
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={colors.tabIconDefault}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            onPress={submit}
            disabled={isLoading}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitText}>
              {isLoading ? t('auth.forgotPasswordScreen.sending') : t('auth.forgotPasswordScreen.send')}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 22,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
