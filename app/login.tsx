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
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AFTER_LOGIN, sanitizeReturnPath } from '@/lib/needAuth';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleGMark } from '@/components/auth/google-g-mark';
import { useAuthStore } from '@/store/auth-store';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthHeroBackground } from '@/components/auth/auth-hero-background';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { login, loginWithApple, loginWithGoogle, isLoading, resendVerification } = useAuthStore();
  const { next: nextParam } = useLocalSearchParams<{ next?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [step, setStep] = useState<'method' | 'form'>('method');

  const inputBg = isDark ? '#1c1c1e' : '#f5f5f7';
  const borderColor = isDark ? '#2a2a2a' : '#e5e5ea';

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) {
        Alert.alert(t('common.error'), t('auth.googleError'));
        return;
      }
      await loginWithGoogle(idToken);
      const rawNext = Array.isArray(nextParam) ? nextParam[0] : nextParam;
      const dest = sanitizeReturnPath(rawNext ?? DEFAULT_AFTER_LOGIN);
      router.replace(dest as Href);
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === -5 || code === 12501) return; // usuario canceló
      const msg = err instanceof Error ? err.message : t('auth.googleError');
      Alert.alert(t('common.error'), msg);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        Alert.alert(t('common.error'), t('auth.appleError'));
        return;
      }
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ') || undefined;
      await loginWithApple(credential.identityToken, fullName);
      const rawNext = Array.isArray(nextParam) ? nextParam[0] : nextParam;
      const dest = sanitizeReturnPath(rawNext ?? DEFAULT_AFTER_LOGIN);
      router.replace(dest as Href);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      const msg = err instanceof Error ? err.message : t('auth.appleError');
      Alert.alert(t('common.error'), msg);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    try {
      await login(email.trim(), password);
      const rawNext = Array.isArray(nextParam) ? nextParam[0] : nextParam;
      const dest = sanitizeReturnPath(rawNext ?? DEFAULT_AFTER_LOGIN);
      router.replace(dest as Href);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.loginError');
      if (msg.includes('verificad')) {
        Alert.alert(
          t('auth.emailNotVerified'),
          t('auth.emailNotVerifiedBody'),
          [
            { text: t('common.ok'), style: 'cancel' },
            {
              text: t('auth.resendEmail'),
              onPress: async () => {
                try {
                  const r = await resendVerification(email.trim());
                  Alert.alert(t('common.ok'), r.message || t('auth.resendSuccess'));
                } catch (reErr) {
                  Alert.alert(
                    t('common.error'),
                    reErr instanceof Error ? reErr.message : t('auth.resendError'),
                  );
                }
              },
            },
          ],
        );
      } else {
        Alert.alert(t('common.error'), msg);
      }
    }
  };

  // ─── Step 1: pantalla de bienvenida ────────────────────────
  if (step === 'method') {
    return (
      <AuthHeroBackground style={styles.bgImage}>
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
          locations={[0, 0.28, 0.62, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        <TouchableOpacity
          style={[styles.backBtn, { top: top + 16 }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.welcomeLayout, { paddingBottom: bottom + 32 }]}>
          <View style={styles.methodButtons}>
            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: '#fff' }]}
              onPress={() => setStep('form')}
              activeOpacity={0.85}>
              <Ionicons name="mail" size={20} color="#111" />
              <ThemedText style={[styles.methodBtnText, { color: '#111' }]}>
                {t('auth.continueWithEmail')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: '#fff' }]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.85}>
              <GoogleGMark size={22} />
              <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>
                {t('auth.continueWithGoogle')}
              </ThemedText>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.methodBtn, { backgroundColor: '#000' }]}
                onPress={handleAppleLogin}
                disabled={isLoading}
                activeOpacity={0.85}>
                <Ionicons name="logo-apple" size={22} color="#fff" />
                <ThemedText style={[styles.methodBtnText, { color: '#fff' }]}>
                  {t('auth.continueWithApple')}
                </ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
              <ThemedText style={[styles.orText, { color: 'rgba(255,255,255,0.6)' }]}>{t('common.or')}</ThemedText>
              <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            </View>

            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.replace('/register')}
              activeOpacity={0.85}>
              <ThemedText style={styles.methodBtnText}>{t('auth.signUp')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </AuthHeroBackground>
    );
  }

  // ─── Step 2: formulario email/contraseña ─────────────────────
  return (
    <View style={[styles.formContainer, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.formScroll, { paddingTop: top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <TouchableOpacity onPress={() => setStep('method')} activeOpacity={0.7}>
            <View style={[styles.backBtnForm, { backgroundColor: inputBg, borderColor }]}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>

          <ThemedText style={[styles.title, { color: colors.text }]}>{t('auth.signIn')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {t('auth.emailSubtitle')}
          </ThemedText>

          <View style={styles.fields}>
            <View style={[styles.field, {
              backgroundColor: inputBg,
              borderColor: focusedField === 'email' ? colors.tint : borderColor,
            }]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={focusedField === 'email' ? colors.tint : colors.icon}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={colors.tabIconDefault}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={[styles.field, {
              backgroundColor: inputBg,
              borderColor: focusedField === 'password' ? colors.tint : borderColor,
            }]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focusedField === 'password' ? colors.tint : colors.icon}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.tabIconDefault}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/forgot-password')}>
            <ThemedText style={[styles.forgotText, { color: colors.tint }]}>
              {t('auth.forgotPassword')}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitText}>
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchLink}
            activeOpacity={0.7}
            onPress={() => router.replace('/register')}>
            <ThemedText style={[styles.switchText, { color: colors.icon }]}>
              No tengo cuenta —{' '}
              <ThemedText style={[styles.switchText, { color: colors.tint, fontWeight: '600' }]}>
                Registrarme
              </ThemedText>
            </ThemedText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  welcomeLayout: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
  },
  backBtn: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  methodButtons: { gap: 12 },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
  },
  methodBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 14 },

  formContainer: { flex: 1 },
  formScroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  backBtnForm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 22,
  },
  fields: {
    gap: 14,
    marginBottom: 16,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  switchText: {
    fontSize: 14,
    textAlign: 'center',
  },
  submitBtn: {
    height: 52,
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
