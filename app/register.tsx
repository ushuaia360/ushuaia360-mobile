import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GoogleGMark } from '@/components/auth/google-g-mark';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthHeroBackground } from '@/components/auth/auth-hero-background';
import { fetchLegalDocument, type LegalDocument } from '@/services/api';
import Animated, { FadeIn } from 'react-native-reanimated';

function checkRequirements(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

type ReqKey = 'length' | 'uppercase' | 'number' | 'special';
const REQUIREMENT_KEYS: ReqKey[] = ['length', 'uppercase', 'number', 'special'];

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { register, isLoading } = useAuthStore();

  const [legalModal, setLegalModal] = useState<{ type: 'terms' | 'privacy'; title: string } | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocument | null>(null);
  const [legalLoading, setLegalLoading] = useState(false);
  const [legalError, setLegalError] = useState(false);

  const openLegal = useCallback(async (type: 'terms' | 'privacy') => {
    const title = type === 'terms' ? t('auth.register.legalTerms') : t('auth.register.legalPrivacy');
    setLegalModal({ type, title });
    setLegalDoc(null);
    setLegalError(false);
    setLegalLoading(true);
    try {
      const doc = await fetchLegalDocument(type);
      setLegalDoc(doc);
    } catch {
      setLegalError(true);
    } finally {
      setLegalLoading(false);
    }
  }, [t]);

  const [step, setStep] = useState<'method' | 'form'>('method');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const reqs = checkRequirements(password);
  const allReqsMet = Object.values(reqs).every(Boolean);

  const inputBg = isDark ? '#1c1c1e' : '#f5f5f7';
  const borderColor = isDark ? '#2a2a2a' : '#e5e5ea';

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }
    if (!allReqsMet) {
      Alert.alert(t('common.error'), t('auth.register.passwordRequirements'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.register.passwordMismatch'));
      return;
    }

    try {
      await register(name.trim(), email.trim(), password, confirmPassword);
      router.replace({ pathname: '/verify-email-sent', params: { email: email.trim() } } as never);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('auth.register.registerError');
      Alert.alert(t('common.error'), msg);
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
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
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
              onPress={() => Alert.alert(t('common.soon'), t('auth.register.soonGoogle'))}
              activeOpacity={0.85}>
              <GoogleGMark size={22} />
              <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>
                {t('auth.continueWithGoogle')}
              </ThemedText>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.methodBtn, { backgroundColor: '#000' }]}
                onPress={() => Alert.alert(t('common.soon'), t('auth.register.soonApple'))}
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
              onPress={() => router.replace('/login')}
              activeOpacity={0.85}>
              <ThemedText style={styles.methodBtnText}>{t('auth.signIn')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </AuthHeroBackground>
    );
  }

  // ─── Step 2: formulario de registro ─────────────────────────
  const confirmBorderColor =
    confirmPassword.length > 0
      ? confirmPassword === password
        ? '#34c759'
        : '#ff3b30'
      : focusedField === 'confirm'
        ? colors.tint
        : borderColor;

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

          <ThemedText style={[styles.title, { color: colors.text, marginTop: 40 }]}>{t('auth.register.title')}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {t('auth.register.subtitle')}
          </ThemedText>

          <View style={styles.fields}>
            <View style={[styles.field, {
              backgroundColor: inputBg,
              borderColor: focusedField === 'name' ? colors.tint : borderColor,
            }]}>
              <Ionicons
                name="person-outline"
                size={18}
                color={focusedField === 'name' ? colors.tint : colors.icon}
              />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder={t('auth.register.namePlaceholder')}
                placeholderTextColor={colors.tabIconDefault}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

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
                placeholder={t('auth.register.emailPlaceholder')}
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

            <View style={styles.fieldGroup}>
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

              {password.length > 0 && (
                <View style={styles.requirements}>
                  {REQUIREMENT_KEYS.map((key) => (
                    <View key={key} style={styles.reqRow}>
                      <Ionicons
                        name={reqs[key] ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={reqs[key] ? '#34c759' : colors.tabIconDefault}
                      />
                      <ThemedText style={[styles.reqText, { color: reqs[key] ? '#34c759' : colors.icon }]}>
                        {t(`auth.register.req.${key}`)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.field, {
              backgroundColor: inputBg,
              borderColor: confirmBorderColor,
            }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.icon} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder={t('auth.register.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.tabIconDefault}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirm(p => !p)} hitSlop={8}>
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitText}>
              {isLoading ? t('auth.register.creating') : t('auth.register.create')}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.legalWrap}>
            <ThemedText style={[styles.legalText, { color: colors.icon }]}>
              {t('auth.register.legalConsent')}{' '}
              <ThemedText
                style={[styles.legalText, styles.legalLink, { color: colors.tint }]}
                onPress={() => void openLegal('terms')}>
                {t('auth.register.legalTerms')}
              </ThemedText>
              {' '}{t('auth.register.legalAnd')}{' '}
              <ThemedText
                style={[styles.legalText, styles.legalLink, { color: colors.tint }]}
                onPress={() => void openLegal('privacy')}>
                {t('auth.register.legalPrivacy')}
              </ThemedText>
              .
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.switchLink}
            activeOpacity={0.7}
            onPress={() => router.replace('/login')}>
            <ThemedText style={[styles.switchText, { color: colors.icon }]}>
              Ya tengo cuenta —{' '}
              <ThemedText style={[styles.switchText, { color: colors.tint, fontWeight: '600' }]}>
                Iniciar sesión
              </ThemedText>
            </ThemedText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Legal document modal */}
      <Modal
        visible={legalModal != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLegalModal(null)}>
        <View style={[styles.legalModalRoot, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
          <View style={[styles.legalModalHeader, { borderBottomColor: isDark ? '#2a2a2a' : '#e5e5ea' }]}>
            <ThemedText style={styles.legalModalTitle}>{legalModal?.title ?? ''}</ThemedText>
            <TouchableOpacity onPress={() => setLegalModal(null)} activeOpacity={0.7} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.legalModalContent}
            showsVerticalScrollIndicator>
            {legalLoading ? (
              <Animated.View entering={FadeIn} style={styles.legalModalCenter}>
                <ActivityIndicator size="large" color={colors.tint} />
              </Animated.View>
            ) : legalError ? (
              <Animated.View entering={FadeIn} style={styles.legalModalCenter}>
                <Ionicons name="alert-circle-outline" size={44} color={colors.icon} />
                <ThemedText style={[styles.legalModalEmpty, { color: colors.icon }]}>
                  {t('auth.register.legalError')}
                </ThemedText>
              </Animated.View>
            ) : legalDoc?.content ? (
              <Animated.View entering={FadeIn}>
                <ThemedText style={[styles.legalModalBody, { color: colors.text }]}>
                  {legalDoc.content}
                </ThemedText>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn} style={styles.legalModalCenter}>
                <Ionicons name="document-text-outline" size={44} color={colors.icon} />
                <ThemedText style={[styles.legalModalEmpty, { color: colors.icon }]}>
                  {t('auth.register.legalLoading')}
                </ThemedText>
              </Animated.View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    overflow: 'hidden',
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
    marginBottom: 28,
  },
  fieldGroup: { gap: 8 },
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
  requirements: {
    gap: 8,
    paddingLeft: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqText: { fontSize: 13 },
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
  switchLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  switchText: {
    fontSize: 14,
    textAlign: 'center',
  },
  legalWrap: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalModalRoot: { flex: 1 },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legalModalTitle: { fontSize: 17, fontWeight: '700', flex: 1, marginRight: 12 },
  legalModalContent: { padding: 20, paddingBottom: 48 },
  legalModalCenter: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  legalModalBody: { fontSize: 14, lineHeight: 22 },
  legalModalEmpty: { fontSize: 15, textAlign: 'center' },
});
