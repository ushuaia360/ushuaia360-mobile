import { useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { DEFAULT_AFTER_LOGIN, sanitizeReturnPath } from '@/lib/needAuth';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleGMark } from '@/components/auth/google-g-mark';
import { useAuthStore } from '@/store/auth-store';
import { LinearGradient } from 'expo-linear-gradient';

const BG_IMAGE = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200';

export default function LoginScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { login, isLoading, resendVerification } = useAuthStore();
  const { next: nextParam } = useLocalSearchParams<{ next?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [step, setStep] = useState<'method' | 'form'>('method');

  const inputBg = isDark ? '#1c1c1e' : '#f5f5f7';
  const borderColor = isDark ? '#2a2a2a' : '#e5e5ea';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completá todos los campos');
      return;
    }
    try {
      await login(email.trim(), password);
      const rawNext = Array.isArray(nextParam) ? nextParam[0] : nextParam;
      const dest = sanitizeReturnPath(rawNext ?? DEFAULT_AFTER_LOGIN);
      router.replace(dest as Href);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      if (msg.includes('verificad')) {
        Alert.alert(
          'Email no verificado',
          'Revisá tu bandeja de entrada y verificá tu cuenta antes de ingresar.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Reenviar email',
              onPress: async () => {
                try {
                  const r = await resendVerification(email.trim());
                  Alert.alert('Listo', r.message || 'Si la cuenta existe, te enviamos un nuevo enlace.');
                } catch (reErr) {
                  Alert.alert(
                    'Error',
                    reErr instanceof Error ? reErr.message : 'No se pudo reenviar el email',
                  );
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  // ─── Step 1: pantalla de bienvenida ────────────────────────
  if (step === 'method') {
    return (
      <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bgImage} resizeMode="cover">
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
                Continuar con correo
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: '#fff' }]}
              onPress={() => Alert.alert('Próximamente', 'El acceso con Google estará disponible pronto.')}
              activeOpacity={0.85}>
              <GoogleGMark size={22} />
              <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>
                Continuar con Google
              </ThemedText>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.methodBtn, { backgroundColor: '#000' }]}
                onPress={() => Alert.alert('Próximamente', 'El acceso con Apple estará disponible pronto.')}
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
              onPress={() => router.replace('/register')}
              activeOpacity={0.85}>
              <ThemedText style={styles.methodBtnText}>Registrarse</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
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

          <ThemedText style={[styles.title, { color: colors.text }]}>Iniciar sesión</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            Ingresá con tu correo electrónico
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
                placeholder="Correo electrónico"
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
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Recuperar contraseña',
                'Ingresá tu correo en el campo de arriba y te enviaremos un enlace de recuperación.',
              )
            }>
            <ThemedText style={[styles.forgotText, { color: colors.tint }]}>
              ¿Olvidaste tu contraseña?
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitText}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
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
