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
import { Link, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
// @ts-ignore - Will be available after installing dependencies
import * as AppleAuthentication from 'expo-apple-authentication';

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    // TODO: Implementar registro con email
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Éxito', 'Registro exitoso');
      router.replace('/(tabs)');
    }, 1000);
  };

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      // TODO: Configurar Google OAuth
      Alert.alert('Google Register', 'Funcionalidad de Google próximamente');
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'No se pudo registrar con Google');
    }
  };

  const handleAppleRegister = async () => {
    try {
      setLoading(true);
      if (!AppleAuthentication || !AppleAuthentication.isAvailableAsync || !(await AppleAuthentication.isAvailableAsync())) {
        Alert.alert('Error', 'Apple Sign In no está disponible en este dispositivo');
        setLoading(false);
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // TODO: Procesar credenciales de Apple
      Alert.alert('Éxito', `Bienvenido ${credential.fullName?.givenName || 'Usuario'}`);
      router.replace('/(tabs)');
      setLoading(false);
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') {
        setLoading(false);
        return;
      }
      setLoading(false);
      Alert.alert('Error', 'No se pudo registrar con Apple');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Crear Cuenta
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Regístrate para comenzar a explorar
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <IconSymbol name="person.fill" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]}
                placeholder="Nombre completo"
                placeholderTextColor={colors.tabIconDefault}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol name="envelope" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.tabIconDefault}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol name="lock.fill" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]}
                placeholder="Contraseña"
                placeholderTextColor={colors.tabIconDefault}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
              />
            </View>

            <View style={styles.inputContainer}>
              <IconSymbol name="lock.fill" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.tabIconDefault}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={handleEmailRegister}
              disabled={loading}>
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
                {loading ? 'Registrando...' : 'Registrarse'}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]} />
              <ThemedText style={styles.dividerText}>o regístrate con</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff', borderColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]}
                onPress={handleGoogleRegister}
                disabled={loading}>
                <IconSymbol name="globe" size={24} color={colors.text} />
                <ThemedText style={styles.socialButtonText}>Google</ThemedText>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialButton, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff', borderColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5' }]}
                  onPress={handleAppleRegister}
                  disabled={loading}>
                  <IconSymbol name="applelogo" size={24} color={colors.text} />
                  <ThemedText style={styles.socialButtonText}>Apple</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>¿Ya tienes una cuenta? </ThemedText>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <ThemedText style={[styles.footerLink, { color: colors.tint }]}>
                    Inicia sesión
                  </ThemedText>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
