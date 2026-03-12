import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import SearchBar from './search-bar';
import TrailListCard from './trail-list-card';
import { useTrailsStore } from '@/store/trails-store';
import { useHomeStore } from '@/store/home-store';

export default function ListHome() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { filteredTrails } = useTrailsStore();
  const { setMode, searchOpen, setSearchOpen } = useHomeStore();

  const results = filteredTrails();

  return (
    <ThemedView style={styles.container}>
      {/* Fixed header */}
      <View style={[
        styles.header,
        {
          paddingTop: top + 16,
          backgroundColor: isDark ? '#1c1c1e' : '#fff',
          borderBottomColor: isDark ? '#2a2a2a' : '#EDF0F5',
        },
      ]}>
        <SearchBar
          onPress={() => setSearchOpen(true)}
          isActive={searchOpen}
        />
      </View>

      {/* Trail list */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrailListCard
            trail={item}
            onMapPress={() => setMode('map')}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <IconSymbol name="magnifyingglass" size={40} color={isDark ? '#444' : '#ccc'} />
            <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
              No se encontraron senderos
            </ThemedText>
          </View>
        }
      />

      {/* Floating "Ver Mapa" FAB */}
      <TouchableOpacity
        style={[styles.mapFab, { borderColor: colors.tint }]}
        onPress={() => setMode('map')}
        activeOpacity={0.85}>
        <IconSymbol name="map.fill" size={17} color={colors.tint} />
        <ThemedText style={[styles.mapFabText, { color: colors.tint }]}>Ver Mapa</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  list: {
    paddingTop: 14,
    paddingBottom: 110,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  mapFab: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  mapFabText: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 15,
    fontWeight: '500',
  },
});
