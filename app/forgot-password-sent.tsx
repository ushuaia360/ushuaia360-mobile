import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RESEND_COOLDOWN = 40;

export default function ForgotPasswordSentScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = emailParam ?? '';

  const forgotPassword = useAuthStore((s) => s.forgotPassword);

  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCountdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || resending || !email) return;
    setResending(true);
    try {
      await forgotPassword(email);
      setResendDone(true);
      startCountdown();
    } catch {
      // silencioso
    } finally {
      setResending(false);
    }
  }, [countdown, resending, email, forgotPassword, startCountdown]);

  const canResend = countdown === 0 && !resending;

  const bg = isDark ? '#121212' : '#fff';
  const cardBg = isDark ? '#1c1c1e' : '#f5f5f7';

  return (
    <View style={[styles.screen, { backgroundColor: bg, paddingTop: top + 20, paddingBottom: bottom + 32 }]}>
      {/* Back */}
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5', borderColor: isDark ? '#2a2a2a' : '#ebebeb' }]}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
        activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.tint + '18' }]}>
          <View style={[styles.iconInner, { backgroundColor: colors.tint + '28' }]}>
            <Ionicons name="lock-open-outline" size={44} color={colors.tint} />
          </View>
        </View>

        <ThemedText style={[styles.title, { color: colors.text }]}>
          Revisá tu email
        </ThemedText>

        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
          Te enviamos las instrucciones a
        </ThemedText>

        {email ? (
          <View style={[styles.emailChip, { backgroundColor: cardBg }]}>
            <Ionicons name="mail-outline" size={15} color={colors.tint} />
            <ThemedText style={[styles.emailText, { color: colors.text }]} numberOfLines={1}>
              {email}
            </ThemedText>
          </View>
        ) : null}

        <ThemedText style={[styles.description, { color: colors.icon }]}>
          El email contiene un enlace para crear una nueva contraseña. Si no lo encontrás, revisá la carpeta de spam.
        </ThemedText>

        {/* Steps card */}
        <View style={[styles.stepsCard, { backgroundColor: cardBg }]}>
          {[
            { icon: 'mail-open-outline' as const,        text: 'Abrí tu casilla de email' },
            { icon: 'link-outline' as const,              text: 'Hacé clic en el enlace de recuperación' },
            { icon: 'lock-closed-outline' as const,       text: 'Creá tu nueva contraseña' },
          ].map((step, i, arr) => (
            <View key={i}>
              <View style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: colors.tint + '18' }]}>
                  <Ionicons name={step.icon} size={18} color={colors.tint} />
                </View>
                <ThemedText style={[styles.stepText, { color: colors.text }]}>{step.text}</ThemedText>
              </View>
              {i < arr.length - 1 && (
                <View style={[styles.stepDivider, { backgroundColor: isDark ? '#2a2a2a' : '#e8e8ed' }]} />
              )}
            </View>
          ))}
        </View>

        {/* Resend button */}
        <TouchableOpacity
          style={[
            styles.resendBtn,
            {
              backgroundColor: canResend ? colors.tint : isDark ? '#1c1c1e' : '#f0f0f5',
              borderWidth: canResend ? 0 : 1,
              borderColor: isDark ? '#2a2a2a' : '#e5e5ea',
            },
          ]}
          activeOpacity={canResend ? 0.82 : 1}
          onPress={handleResend}
          disabled={!canResend}>
          {resending ? (
            <ThemedText style={[styles.resendText, { color: colors.icon }]}>Enviando…</ThemedText>
          ) : resendDone && countdown > 0 ? (
            <ThemedText style={[styles.resendText, { color: colors.icon }]}>Email reenviado · {countdown}s</ThemedText>
          ) : countdown > 0 ? (
            <ThemedText style={[styles.resendText, { color: colors.icon }]}>Reenviar instrucciones · {countdown}s</ThemedText>
          ) : (
            <ThemedText style={[styles.resendText, { color: '#fff' }]}>Reenviar instrucciones</ThemedText>
          )}
        </TouchableOpacity>

        {/* Login link */}
        <TouchableOpacity
          style={styles.loginLink}
          activeOpacity={0.7}
          onPress={() => router.replace('/login')}>
          <ThemedText style={[styles.loginLinkText, { color: colors.icon }]}>
            Recordé mi contraseña —{' '}
            <ThemedText style={[styles.loginLinkText, { color: colors.tint, fontWeight: '600' }]}>
              Iniciar sesión
            </ThemedText>
          </ThemedText>
        </TouchableOpacity>
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
    marginBottom: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
    gap: 16,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: -8,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: '90%',
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  description: {
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
  stepDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  resendBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loginLink: {
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
