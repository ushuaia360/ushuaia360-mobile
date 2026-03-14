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
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';

const BG_IMAGE = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200';

export default function LoginScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // 'method' → pantalla de bienvenida | 'form' → formulario de email
  const [step, setStep] = useState<'method' | 'form'>('method');

  const inputBg = isDark ? '#1c1c1e' : '#fff';
  const borderColor = isDark ? '#2a2a2a' : '#ebebeb';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completá todos los campos');
      return;
    }
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      // Email no verificado → ofrecer reenviar
      if (msg.includes('verificad')) {
        Alert.alert(
          'Email no verificado',
          'Revisá tu bandeja de entrada y verificá tu cuenta antes de ingresar.',
          [{ text: 'OK' }],
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
        <View style={styles.bgOverlay} />
        {/* Gradient */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {[0.55, 0.45, 0.34, 0.24, 0.15, 0.08, 0.03, 0].map((opacity, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${(i + 1) * 12}%`,
                backgroundColor: `rgba(0,0,0,${opacity})`,
              }}
            />
          ))}
        </View>

        {/* Back */}
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: 'rgba(255,255,255,0.4)', position: 'absolute', top: top + 16, left: 24 }]}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.container, { paddingTop: top + 400 }]}>
          <View style={styles.methodButtons}>

            {/* Correo */}
            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: '#fff' }]}
              onPress={() => setStep('form')}
              activeOpacity={0.85}>
              <Ionicons name="mail" size={20} color="#000" />
              <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>
                Continuar con correo
              </ThemedText>
            </TouchableOpacity>

            {/* Google */}
            <TouchableOpacity
              style={[styles.methodBtn, { backgroundColor: '#fff' }]}
              onPress={() => Alert.alert('Próximamente', 'El acceso con Google estará disponible pronto.')}
              activeOpacity={0.85}>
              {/* G de Google con colores */}
              <View style={styles.googleIcon}>
                <ThemedText style={styles.googleG}>G</ThemedText>
              </View>
              <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>
                Continuar con Google
              </ThemedText>
            </TouchableOpacity>

            {/* Apple — solo iOS */}
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
              <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
              <ThemedText style={[styles.orText, { color: 'rgba(255,255,255,0.7)' }]}>o</ThemedText>
              <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
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

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: inputBg, borderColor }]}
            onPress={() => setStep('method')}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <ThemedText style={[styles.title, { color: colors.text }]}>Iniciar sesión</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            Ingresá con tu correo electrónico
          </ThemedText>

          <View style={styles.fields}>
            {/* Email */}
            <View style={styles.fieldGroup}>
              <View style={[styles.field, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="mail-outline" size={18} color={colors.icon} />
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  placeholder="Correo electrónico"
                  placeholderTextColor={colors.tabIconDefault}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Contraseña */}
            <View style={styles.fieldGroup}>
              <View style={[styles.field, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.icon} />
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.tabIconDefault}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitText}>
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </ThemedText>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: borderColor }]} />

          <TouchableOpacity
            style={styles.forgotBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Recuperar contraseña',
                'Ingresá tu correo en el campo de arriba y presioná el botón para enviarte un enlace de recuperación.',
              )
            }>
            <ThemedText style={[styles.forgotText, { color: colors.icon }]}>
              ¿Olvidaste tu contraseña?
            </ThemedText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  container: {
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
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  methodButtons: { gap: 14 },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
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
  },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 14 },
  formContainer: { flex: 1 },
  formScroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 28,
  },
  fields: {
    gap: 20,
    marginBottom: 28,
  },
  fieldGroup: { gap: 7 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  forgotBtn: {
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '400',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#dadce0',
  },
  googleG: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4285F4',
    lineHeight: 16,
  },
});
