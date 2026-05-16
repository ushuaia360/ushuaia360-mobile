import { ThemedText } from '@/components/themed-text';
import TrailImage from '@/components/home/trail-image';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatPlaceCategoryLabel, getPlaceCategoryVisual } from '@/lib/place-category-map';
import { resolveApiMediaUrl } from '@/lib/resolve-api-media-url';
import type { MapMarker } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type IonName = ComponentProps<typeof Ionicons>['name'];

function formatDurationMinutes(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  const hours = minutes / 60;
  const low = Math.floor(hours);
  const high = Math.ceil(hours);
  return low === high ? `${low} hs` : `${low}–${high} hs`;
}

type TFunc = (key: string) => string;

function buildTrailStatChips(m: Extract<MapMarker, { kind: 'trail' }>, t: TFunc): { icon: IonName; label: string }[] {
  const chips: { icon: IonName; label: string }[] = [];
  if (m.difficulty) {
    const diffKey = `mapCard.difficulty.${m.difficulty}`;
    chips.push({
      icon: 'pulse-outline',
      label: t(diffKey) !== diffKey ? t(diffKey) : m.difficulty,
    });
  }
  if (m.distance_km != null) {
    chips.push({ icon: 'map-outline', label: `${m.distance_km} km` });
  }
  const dur = formatDurationMinutes(m.duration_minutes);
  if (dur) chips.push({ icon: 'time-outline', label: dur });
  if (m.elevation_gain != null) {
    chips.push({
      icon: 'trending-up-outline',
      label: `${m.elevation_gain} m`,
    });
  }
  const rtKey = m.route_type ? `mapCard.routeType.${m.route_type}` : null;
  const rt = rtKey ? (t(rtKey) !== rtKey ? t(rtKey) : m.route_type) : null;
  if (rt) chips.push({ icon: 'git-compare-outline', label: rt });
  return chips;
}

interface ChipProps {
  icon: IonName;
  label: string;
  chipBg: string;
  chipBorder: string;
  iconColor: string;
  textColor: string;
}

function StatChip({ icon, label, chipBg, chipBorder, iconColor, textColor }: ChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <ThemedText style={[styles.chipText, { color: textColor }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

interface Props {
  marker: MapMarker;
  onClose: () => void;
}

export default function MapMarkerBottomCard({ marker, onClose }: Props) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const isTrail = marker.kind === 'trail';
  const thumb = resolveApiMediaUrl(marker.thumbnail_url) ?? undefined;
  const ctaLabel = isTrail ? t('mapCard.viewTrail') : t('mapCard.viewPlace');
  const placeIconVisual = !isTrail ? getPlaceCategoryVisual(marker.category, isDark) : null;

  const chipBg = isDark ? '#3a3a3c' : '#fff';
  const chipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const chipIcon = colors.tint;
  const chipText = colors.text;

  const openDetail = () => {
    onClose();
    if (isTrail) {
      router.push({ pathname: '/trails/[id]', params: { id: marker.id } } as never);
    } else {
      router.push({ pathname: '/places/[id]', params: { id: marker.id } } as never);
    }
  };

  const trailChips = isTrail ? buildTrailStatChips(marker, t) : [];

  const placeMeta = !isTrail
    ? (() => {
        const hasCat = marker.category != null && String(marker.category).trim() !== '';
        const cat = hasCat ? formatPlaceCategoryLabel(marker.category) : null;
        const reg = marker.region != null && String(marker.region).trim() !== '' ? marker.region : null;
        return [cat, reg].filter(Boolean).join(' · ') || null;
      })()
    : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#2c2c2e' : '#f7f8fa',
          borderColor: isDark ? '#3a3a3c' : '#e8ecf0',
        },
      ]}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <Ionicons
            name={isTrail ? 'footsteps' : placeIconVisual?.icon ?? 'location'}
            size={14}
            color={isTrail ? colors.tint : placeIconVisual?.accent ?? colors.tint}
          />
          <ThemedText style={[styles.badge, { color: colors.tint }]}>
            {isTrail ? t('mapCard.trail') : t('mapCard.place')}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('mapCard.closeDetail')}>
          <Ionicons
            name="close-circle"
            size={26}
            color={isDark ? '#8e8e93' : '#aeaeb2'}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TrailImage uri={thumb} style={styles.thumb} contentFit="cover" />
        <View style={styles.textCol}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {marker.name}
          </ThemedText>

          {isTrail && trailChips.length > 0 ? (
            <View style={styles.chipsWrap}>
              {trailChips.map((c, i) => (
                <StatChip
                  key={`${String(c.icon)}-${i}`}
                  icon={c.icon}
                  label={c.label}
                  chipBg={chipBg}
                  chipBorder={chipBorder}
                  iconColor={chipIcon}
                  textColor={chipText}
                />
              ))}
            </View>
          ) : null}

          {!isTrail && placeMeta ? (
            <ThemedText style={[styles.metaLine, { color: colors.icon }]} numberOfLines={2}>
              {placeMeta}
            </ThemedText>
          ) : null}

          {isTrail && marker.region ? (
            <View style={styles.locRow}>
              <Ionicons name="location-outline" size={14} color={colors.icon} />
              <ThemedText style={[styles.regionText, { color: colors.icon }]} numberOfLines={1}>
                {marker.region}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.cta, { backgroundColor: colors.tint }]}
        onPress={openDetail}
        activeOpacity={0.88}>
        <ThemedText style={styles.ctaText}>{ctaLabel}</ThemedText>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  thumb: {
    width: 92,
    height: 92,
    borderRadius: 12,
  },
  textCol: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaLine: {
    fontSize: 14,
    lineHeight: 19,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  regionText: {
    fontSize: 13,
    flex: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
