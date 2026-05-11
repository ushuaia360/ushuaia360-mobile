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

function checkRequirements(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

const REQUIREMENTS = [
  { key: 'length', label: 'Mínimo 8 caracteres' },
  { key: 'uppercase', label: 'Una letra mayúscula' },
  { key: 'number', label: 'Un número' },
  { key: 'special', label: 'Un carácter especial' },
] as const;

export default function RegisterScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { register, isLoading } = useAuthStore();

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
      Alert.alert('Error', 'Por favor completá todos los campos');
      return;
    }
    if (!allReqsMet) {
      Alert.alert('Error', 'La contraseña no cumple los requisitos');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      const result = await register(name.trim(), email.trim(), password, confirmPassword);
      Alert.alert(
        'Registro exitoso',
        result.message || 'Revisá tu correo para verificar tu cuenta antes de ingresar.',
        [{ text: 'Ir a iniciar sesión', onPress: () => router.replace('/login') }],
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse';
      Alert.alert('Error', msg);
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
                Continuar con correo
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: '#fff' }]}
              onPress={() => Alert.alert('Próximamente', 'El registro con Google estará disponible pronto.')}
              activeOpacity={0.85}>
              <GoogleGMark size={22} />
              <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>
                Continuar con Google
              </ThemedText>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.methodBtn, { backgroundColor: '#000' }]}
                onPress={() => Alert.alert('Próximamente', 'El registro con Apple estará disponible pronto.')}
                activeOpacity={0.85}>
                <Ionicons name="logo-apple" size={22} color="#fff" />
                <ThemedText style={[styles.methodBtnText, { color: '#fff' }]}>
                  Continuar con Apple
                </ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
              <ThemedText style={[styles.orText, { color: 'rgba(255,255,255,0.6)' }]}>o</ThemedText>
              <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            </View>

            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.replace('/login')}
              activeOpacity={0.85}>
              <ThemedText style={styles.methodBtnText}>Iniciar sesión</ThemedText>
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

          <ThemedText style={[styles.title, { color: colors.text, marginTop: 40 }]}>Crear cuenta</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            Registrate con tu correo electrónico
          </ThemedText>

          <View style={styles.fields}>
            {/* Nombre */}
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
                placeholder="Tu nombre completo"
                placeholderTextColor={colors.tabIconDefault}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Email */}
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
                placeholder="tu@correo.com"
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

            {/* Contraseña */}
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
                  placeholder="Contraseña"
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
                  {REQUIREMENTS.map(({ key, label }) => (
                    <View key={key} style={styles.reqRow}>
                      <Ionicons
                        name={reqs[key] ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={reqs[key] ? '#34c759' : colors.tabIconDefault}
                      />
                      <ThemedText style={[styles.reqText, { color: reqs[key] ? '#34c759' : colors.icon }]}>
                        {label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Repetir contraseña */}
            <View style={[styles.field, {
              backgroundColor: inputBg,
              borderColor: confirmBorderColor,
            }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.icon} />
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="Repetí tu contraseña"
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
              {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
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
});
