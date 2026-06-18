import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';

interface Props {
  visible: boolean;
  message?: string;
  subtitle?: string;
  onHide: () => void;
  /** ms antes de empezar a ocultarse — default 2200 */
  duration?: number;
  /** px extra sobre el safe area bottom — default 0 */
  bottomOffset?: number;
}

export default function ReportToast({
  visible,
  message,
  subtitle,
  onHide,
  duration = 2200,
  bottomOffset = 0,
}: Props) {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const displayMessage = message ?? t('reportToast.message');
  const displaySubtitle = subtitle ?? t('reportToast.subtitle');

  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (!visible) return;

    const SHOW = { duration: 320, easing: Easing.out(Easing.exp) };
    const HIDE = { duration: 260, easing: Easing.in(Easing.quad) };

    translateY.value = withSequence(
      withTiming(0, SHOW),
      withDelay(duration, withTiming(120, HIDE)),
    );
    opacity.value = withSequence(
      withTiming(1, SHOW),
      withDelay(duration, withTiming(0, HIDE, (finished) => {
        if (finished) runOnJS(onHide)();
      })),
    );
  }, [visible]);

  if (!visible) return null;

  const bg = isDark ? '#1c1c1e' : '#fff';
  const shadow = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.18)';

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: Math.max(bottom, 16) + 8 + bottomOffset, backgroundColor: bg, shadowColor: shadow },
        animStyle,
      ]}
      pointerEvents="none">
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={28} color="#34c759" />
      </View>
      <View style={styles.textWrap}>
        <ThemedText style={styles.message}>{displayMessage}</ThemedText>
        {displaySubtitle ? (
          <ThemedText style={styles.subtitle} numberOfLines={2}>{displaySubtitle}</ThemedText>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 9999,
  },
  iconWrap: {
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 16,
  },
});
