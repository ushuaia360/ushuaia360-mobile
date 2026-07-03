import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import { toTitleCase } from '@/lib/title-case';
import { formatPlaceCategoryLabel } from '@/lib/place-category-map';
import { fetchSearchSuggestions, type SearchSuggestion } from '@/services/api';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SearchScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const q = normalizedQuery;
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetchSearchSuggestions(q, { limit: 12 });
        if (!ac.signal.aborted) setSuggestions(res);
      } catch {
        if (!ac.signal.aborted) setSuggestions([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(handle);
    };
  }, [normalizedQuery]);

  function openSuggestion(item: SearchSuggestion) {
    if (item.type === 'trail') {
      router.push(`/trails/${item.id}`);
      return;
    }
    router.push(`/places/${item.id}`);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <ThemedText type="title">{t('search.title')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('search.subtitle')}</ThemedText>
        </View>
        <View style={styles.content}>
          <View style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5' }]}>
            <IconSymbol name="search-outline" size={20} color={colors.icon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('search.placeholder')}
              placeholderTextColor={colors.tabIconDefault}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {loading ? (
              <ActivityIndicator size="small" color={colors.tabIconDefault} />
            ) : null}
          </View>

          {normalizedQuery ? (
            <View style={styles.suggestionsWrap}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => `${item.type}:${item.id}`}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const thumb = resolveApiMediaUrl(item.thumbnail_url);
                  const icon = item.type === 'trail' ? 'walk-outline' : 'location-outline';
                  const subtitle =
                    item.type === 'trail'
                      ? [
                          item.distance_km != null ? `${item.distance_km} km` : null,
                          item.duration_minutes != null
                            ? item.duration_minutes < 60
                              ? `${item.duration_minutes} min`
                              : `${Math.round(item.duration_minutes / 60)}h`
                            : null,
                        ].filter(Boolean).join(' · ') || t('search.trail')
                      : [item.region, formatPlaceCategoryLabel(item.category)].filter(Boolean).join(' · ') || t('search.place');

                  return (
                    <TouchableOpacity
                      onPress={() => openSuggestion(item)}
                      activeOpacity={0.85}
                      style={[
                        styles.suggestionRow,
                        { borderColor: colorScheme === 'dark' ? '#2f2f2f' : '#e8e8e8' },
                      ]}>
                      {thumb ? (
                        <ExpoImage source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                      ) : (
                        <View
                          style={[
                            styles.thumbFallback,
                            { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f3f3f3' },
                          ]}>
                          <IconSymbol name={icon} size={18} color={colors.tabIconDefault} />
                        </View>
                      )}

                      <View style={styles.suggestionText}>
                        <ThemedText numberOfLines={1} style={styles.suggestionTitle}>
                          {toTitleCase(item.name)}
                        </ThemedText>
                        <ThemedText numberOfLines={1} style={[styles.suggestionSubtitle, { color: colors.tabIconDefault }]}>
                          {subtitle}
                        </ThemedText>
                      </View>

                      <IconSymbol name="chevron-forward" size={18} color={colors.tabIconDefault} />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  loading ? null : (
                    <View style={styles.emptyWrap}>
                      <ThemedText style={{ color: colors.tabIconDefault }}>{t('search.noResults')}</ThemedText>
                    </View>
                  )
                }
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
  content: { padding: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  suggestionsWrap: { marginTop: 12 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 10,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  thumbFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  suggestionTitle: { fontSize: 15 },
  suggestionSubtitle: { fontSize: 12, opacity: 0.9 },
  emptyWrap: {
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
});
