import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/auth-store';
import { useActiveTrailSessionStore } from '@/store/active-trail-session-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

interface Props {
  /** Espacio desde el borde superior del contenedor padre (incluye safe area si aplica) */
  offsetTop: number;
}

export default function ResumeActiveTrailBar({ offsetTop }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const token = useAuthStore((s) => s.token);
  const hydrated = useActiveTrailSessionStore((s) => s.hydrated);
  const session = useActiveTrailSessionStore((s) => s.session);
  const setMinimized = useActiveTrailSessionStore((s) => s.setMinimized);

  if (!token || !hydrated || !session) return null;

  const bg = isDark ? '#2c2c2e' : '#fff';
  const border = isDark ? '#3a3a3c' : '#e5e5ea';

  return (
    <View style={[styles.wrap, { top: offsetTop }]} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [
          styles.bar,
          {
            backgroundColor: bg,
            borderColor: border,
            opacity: pressed ? 0.92 : 1,
            shadowColor: '#000',
          },
        ]}
        onPress={() => {
          void setMinimized(false);
          router.push('/(tabs)/trail-recorrido');
        }}
        accessibilityRole="button"
        accessibilityLabel={`Resumir sendero ${session.trailName}`}>
        {session.thumbnailUrl ? (
          <Image source={{ uri: session.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.tint + '33' }]}>
            <Ionicons name="map-outline" size={22} color={colors.tint} />
          </View>
        )}
        <View style={styles.textCol}>
          <ThemedText style={styles.label} numberOfLines={1}>
            Recorrido en curso
          </ThemedText>
          <ThemedText style={[styles.trailName, { color: colors.tint }]} numberOfLines={1}>
            {session.trailName}
          </ThemedText>
        </View>
        <View style={[styles.resumePill, { backgroundColor: colors.tint }]}>
          <Ionicons name="play" size={14} color="#fff" />
          <ThemedText style={styles.resumeText}>Resumir</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    /** Por debajo del BottomSheet del mapa; el modal de búsqueda sigue tapando por ser `Modal`. */
    zIndex: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.75,
  },
  trailName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  resumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  resumeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
