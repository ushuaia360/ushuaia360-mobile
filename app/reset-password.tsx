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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#121212' : '#fff';
  const inputBg = isDark ? '#1c1c1e' : '#fff';
  const borderColor = isDark ? '#2a2a2a' : '#ebebeb';

  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const raw = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const token = raw?.trim() ?? '';

  const { resetPassword, isLoading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!token) {
      Alert.alert(t('common.error'), t('auth.resetPassword.invalidLink'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.resetPassword.tooShort'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('common.error'), t('auth.resetPassword.mismatch'));
      return;
    }
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('auth.resetPassword.updateError'));
    }
  };

  if (done) {
    const cardBg = isDark ? '#1c1c1e' : '#f5f5f7';
    return (
      <View style={[styles.screen, { backgroundColor: bg, paddingTop: top + 20, paddingBottom: 48 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: inputBg, borderColor }]}
          onPress={() => router.replace('/login')}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.successContent}>
          <View style={[styles.successIconWrap, { backgroundColor: '#34c759' + '18' }]}>
            <View style={[styles.successIconInner, { backgroundColor: '#34c759' + '28' }]}>
              <Ionicons name="checkmark-circle-outline" size={44} color="#34c759" />
            </View>
          </View>
          <ThemedText style={[styles.successTitle, { color: colors.text }]}>
            ¡Contraseña actualizada!
          </ThemedText>
          <ThemedText style={[styles.successSub, { color: colors.icon }]}>
            Tu contraseña fue restablecida correctamente. Ya podés iniciar sesión con tus nuevas credenciales.
          </ThemedText>
          <View style={[styles.stepsCard, { backgroundColor: cardBg }]}>
            <View style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: '#34c759' + '18' }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#34c759" />
              </View>
              <ThemedText style={[styles.stepText, { color: colors.text }]}>Tu cuenta está protegida</ThemedText>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.goLoginBtn, { backgroundColor: colors.tint }]}
            activeOpacity={0.85}
            onPress={() => router.replace('/login')}>
            <ThemedText style={styles.goLoginText}>Iniciar sesión</ThemedText>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

          <ThemedText style={[styles.title, { color: colors.text }]}>{t('auth.resetPassword.title')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {t('auth.resetPassword.subtitle')}
          </ThemedText>

          <View style={[styles.field, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.icon} />
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder={t('auth.resetPassword.newPassword')}
              placeholderTextColor={colors.tabIconDefault}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.field, { backgroundColor: inputBg, borderColor }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.icon} />
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              placeholder={t('auth.resetPassword.repeatPassword')}
              placeholderTextColor={colors.tabIconDefault}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} hitSlop={8}>
              <Ionicons
                name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            onPress={submit}
            disabled={isLoading}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitText}>
              {isLoading ? t('auth.resetPassword.saving') : t('auth.resetPassword.save')}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24 },
  flex: { flex: 1 },
  scroll: {
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
    marginBottom: 16,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  submitBtn: {
    marginTop: 12,
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

  // Success state
  successContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
    gap: 16,
    paddingHorizontal: 0,
  },
  successIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successIconInner: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  successSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  stepsCard: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  goLoginBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  goLoginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
