import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTrailsStore } from '@/store/trails-store';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface Props {
  onSelectRecent: (query: string) => void;
  onSelectNearby: () => void;
}

export default function SearchDropdown({ onSelectRecent, onSelectNearby }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { recentSearches } = useTrailsStore();

  const bg = isDark ? '#1c1c1e' : '#fff';
  const dividerColor = isDark ? '#2a2a2a' : '#f0f0f0';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>

      {/* Puntos cercanos */}
      <TouchableOpacity style={styles.row} onPress={onSelectNearby} activeOpacity={0.75}>
        <View style={[styles.iconWrap, { backgroundColor: colors.tint + '18' }]}>
          <Ionicons name="location-outline" size={18} color={colors.tint} />
        </View>
        <View style={styles.rowText}>
          <ThemedText style={styles.rowTitle}>Puntos cercanos</ThemedText>
          <ThemedText style={[styles.rowSub, { color: colors.icon }]}>Senderos y lugares cerca tuyo</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.icon} />
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: dividerColor }]} />

      {/* Búsquedas recientes */}
      <ThemedText style={[styles.sectionLabel, { color: colors.icon }]}>Búsquedas recientes</ThemedText>

      {recentSearches.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={28} color={isDark ? '#444' : '#ccc'} />
          <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
            No tienes búsquedas recientes
          </ThemedText>
        </View>
      ) : (
        recentSearches.map((q) => (
          <TouchableOpacity
            key={q}
            style={styles.row}
            onPress={() => onSelectRecent(q)}
            activeOpacity={0.75}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
              <Ionicons name="time-outline" size={18} color={colors.icon} />
            </View>
            <ThemedText style={styles.rowTitle}>{q}</ThemedText>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
});
