import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNetworkReachable } from '@/hooks/use-network-reachable';
import { fetchTodayWeather, getWeatherVisual, type DailyWeather } from '@/services/weather';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

interface Props {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

/**
 * Bloque de clima embebido en la card unificada de sendero/lugar (mismo fondo, propio divisor arriba).
 * Solo visible con conexión: sin red no hay forma de traer un pronóstico actual.
 */
export default function WeatherSection({ latitude, longitude }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const networkReachable = useNetworkReachable();
  const isOnline = networkReachable === true;
  const hasCoords = latitude != null && longitude != null;

  const [weather, setWeather] = useState<DailyWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOnline || !hasCoords) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTodayWeather(latitude as number, longitude as number)
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOnline, hasCoords, latitude, longitude]);

  if (!isOnline || !hasCoords) return null;

  const visual = weather ? getWeatherVisual(weather.weatherCode) : null;
  const skelBlock = isDark ? '#2c2c2e' : '#e8eaed';
  const skelBlockInner = isDark ? '#3a3a3c' : '#dfe3e8';

  return (
    <>
      <View style={[styles.divider, { backgroundColor: isDark ? '#2a2a2a' : '#F2F4F7' }]} />
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Ionicons name="partly-sunny-outline" size={16} color={colors.tint} />
          <ThemedText style={[styles.title, { color: colors.text }]}>{t('weather.title')}</ThemedText>
        </View>

        {loading ? (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.skelIcon, { backgroundColor: skelBlock }]} />
              <View>
                <View style={[styles.skelTemp, { backgroundColor: skelBlock }]} />
                <View style={[styles.skelTempMin, { backgroundColor: skelBlockInner }]} />
              </View>
            </View>
            <View style={styles.rowRight}>
              <View style={[styles.skelCondition, { backgroundColor: skelBlock }]} />
              <View style={[styles.skelWind, { backgroundColor: skelBlockInner }]} />
            </View>
          </View>
        ) : error || !weather || !visual ? (
          <ThemedText style={[styles.errorText, { color: colors.icon }]}>{t('weather.loadError')}</ThemedText>
        ) : (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name={visual.icon} size={32} color={colors.tint} />
              <View>
                <ThemedText style={styles.temp}>{weather.temperatureMax}°</ThemedText>
                <ThemedText style={[styles.tempMin, { color: colors.icon }]}>
                  {t('weather.min', { temp: weather.temperatureMin })}
                </ThemedText>
              </View>
            </View>
            <View style={styles.rowRight}>
              <ThemedText style={[styles.condition, { color: colors.text }]} numberOfLines={1}>
                {t(visual.labelKey)}
              </ThemedText>
              <View style={styles.windRow}>
                <Ionicons name="flag-outline" size={12} color={colors.icon} />
                <ThemedText style={[styles.windText, { color: colors.icon }]}>
                  {t('weather.wind', { speed: weather.windSpeedMax })}
                </ThemedText>
              </View>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  skelIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  skelTemp: {
    width: 34,
    height: 18,
    borderRadius: 5,
    marginBottom: 6,
  },
  skelTempMin: {
    width: 46,
    height: 12,
    borderRadius: 4,
  },
  skelCondition: {
    width: 92,
    height: 13,
    borderRadius: 4,
    marginBottom: 7,
    alignSelf: 'flex-end',
  },
  skelWind: {
    width: 64,
    height: 11,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  errorText: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  temp: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
  tempMin: {
    fontSize: 13,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '55%',
  },
  condition: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  windText: {
    fontSize: 12,
  },
});
