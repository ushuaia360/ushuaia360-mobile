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

const BG_IMAGE = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200';
import { Link, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Password requirement check
function checkRequirements(password: string) {
  return {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };
}

const REQUIREMENTS = [
  { key: 'length',    label: 'Mínimo 8 caracteres' },
  { key: 'uppercase', label: 'Una letra mayúscula' },
  { key: 'number',    label: 'Un número' },
  { key: 'special',   label: 'Un carácter especial' },
] as const;

export default function RegisterScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState<'method' | 'form'>('method');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reqs = checkRequirements(password);
  const allReqsMet = Object.values(reqs).every(Boolean);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
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
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 1000);
  };

  const bg = isDark ? '#121212' : '#fff';
  const inputBg = isDark ? '#1c1c1e' : '#fff';
  const borderColor = isDark ? '#2a2a2a' : '#ebebeb';

  // ─── Step 1: Method selection ───────────────────────────────
  if (step === 'method') {
    return (
      <ImageBackground source={{ uri: BG_IMAGE }} style={styles.bgImage} resizeMode="cover">
        <View style={styles.bgOverlay} />
        {/* Gradient simulation: stacked layers bottom → transparent */}
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

        {/* Back — top */}
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: 'rgba(255,255,255,0.4)', position: 'absolute', top: top + 16, left: 24, marginBottom: 0 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

      <View style={[styles.container, { paddingTop: top + 440 }]}>

        {/* Buttons */}
        <View style={styles.methodButtons}>
          <TouchableOpacity
            style={[styles.methodBtn, { backgroundColor: '#fff' }]}
            onPress={() => setStep('form')}
            activeOpacity={0.85}>
            <Ionicons name="mail" size={20} color="#000" />
            <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>Continuar con correo</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, { backgroundColor: '#fff' }]}
            onPress={() => setStep('form')}
            activeOpacity={0.85}>
            <Ionicons name="logo-apple" size={20} color="#000" />
            <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>Continuar con Apple</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodBtn, { backgroundColor: '#fff' }]}
            onPress={() => setStep('form')}
            activeOpacity={0.85}>
            <Ionicons name="logo-google" size={20} color="#000" />
            <ThemedText style={[styles.methodBtnText, { color: '#000' }]}>
              Continuar con Google
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
            <ThemedText style={[styles.orText, { color: 'rgba(255,255,255,0.7)' }]}>o</ThemedText>
            <View style={[styles.orLine, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
          </View>

          <TouchableOpacity
            style={[styles.methodBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.replace('/login')}
            activeOpacity={0.85}>
            <ThemedText style={styles.methodBtnText}>Iniciar sesión</ThemedText>
          </TouchableOpacity>
        </View>

      </View>
      </ImageBackground>
    );
  }

  // ─── Step 2: Form ────────────────────────────────────────────
  return (
    <View style={[styles.formContainer, { backgroundColor: bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.formScroll, { paddingTop: top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: inputBg, borderColor }]}
            onPress={() => setStep('method')}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.fields}>

            {/* Nombre */}
            <View style={styles.fieldGroup}>
              <View style={[styles.field, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="person-outline" size={18} color={colors.icon} />
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  placeholder="Tu nombre"
                  placeholderTextColor={colors.tabIconDefault}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <View style={[styles.field, { backgroundColor: inputBg, borderColor }]}>
                <Ionicons name="mail-outline" size={18} color={colors.icon} />
                <TextInput
                  style={[styles.fieldInput, { color: colors.text }]}
                  placeholder="tu@correo.com"
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
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.icon} />
                </TouchableOpacity>
              </View>

              {/* Requisitos */}
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
            </View>

            {/* Repetir contraseña */}
            <View style={styles.fieldGroup}>
              <View style={[styles.field, {
                backgroundColor: inputBg,
                borderColor: confirmPassword.length > 0
                  ? (confirmPassword === password ? '#34c759' : '#ff3b30')
                  : borderColor,
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
                />
                <TouchableOpacity onPress={() => setShowConfirm(p => !p)} hitSlop={8}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.icon} />
                </TouchableOpacity>
              </View>
            </View>

          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitText}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </ThemedText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Method step
  methodHeader: {
    marginBottom: 40,
  },
  methodTitle: {
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
  },
  methodSubtitle: {
    fontSize: 16,
  },
  methodButtons: {
    gap: 14,
  },
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
  googleBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  loginBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 14,
  },

  // Form step
  formContainer: {
    flex: 1,
  },
  formScroll: {
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
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  formHeader: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 15,
  },
  fields: {
    gap: 20,
    marginBottom: 28,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 2,
  },
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
  requirements: {
    gap: 8,
    marginTop: 6,
    paddingLeft: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqText: {
    fontSize: 13,
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
});
