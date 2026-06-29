import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  message: string;
}

export default function MaintenanceOverlay({ title, message }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { top, bottom } = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: isDark ? '#000' : '#fff',
          paddingTop: top + 24,
          paddingBottom: bottom + 24,
        },
      ]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1c1c1e' : '#F2F4F7' }]}>
          <Ionicons name="construct-outline" size={48} color={colors.tint} />
        </View>

        <ThemedText style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
        <ThemedText style={[styles.message, { color: colors.icon }]}>{message}</ThemedText>

        <View style={[styles.pill, { backgroundColor: isDark ? '#1c1c1e' : '#F2F4F7' }]}>
          <View style={[styles.dot, { backgroundColor: '#ff9500' }]} />
          <ThemedText style={[styles.pillText, { color: colors.icon }]}>
            Volvemos pronto
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 36,
    gap: 16,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
