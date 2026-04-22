import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getPlaceCategoryVisual } from '@/lib/place-category-map';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

/** Tamaño base: ancla centro-inferior en el mapa */
export const MAP_PIN_WIDTH = 58;
export const MAP_PIN_HEIGHT = 64;

export function getWaypointPinBox(sizeScale: number) {
  const s = Math.max(0.48, Math.min(1.55, sizeScale));
  return { width: MAP_PIN_WIDTH * s, height: MAP_PIN_HEIGHT * s, scale: s };
}

interface Props {
  selected: boolean;
  variant: 'trail' | 'place';
  /** Categoría del API (slug o etiqueta); solo aplica a `place`. */
  placeCategory?: string | null;
  onPress: () => void;
  /** 1 = tamaño diseño; &lt;1 al alejar el mapa */
  sizeScale?: number;
}

export default function MapWaypointPin({
  selected,
  variant,
  placeCategory,
  onPress,
  sizeScale = 1,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const s = Math.max(0.48, Math.min(1.55, sizeScale));

  const bubbleBg = isDark ? '#2c2c2e' : '#ffffff';
  const bubbleBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)';
  const placeVisual =
    variant === 'place' ? getPlaceCategoryVisual(placeCategory, isDark) : null;
  const iconColor =
    variant === 'trail'
      ? Colors[colorScheme ?? 'light'].tint
      : placeVisual
        ? placeVisual.accent
        : isDark
          ? '#ff9f0a'
          : '#e85d04';
  const placeIcon = placeVisual?.icon ?? 'camera';
  const pressScale = selected ? 1.08 : 1;
  const shadowOpacity = selected ? 0.24 : 0.15;
  const elevation = selected ? 11 : 7;

  const BUB = 46 * s;
  const caretL = 8 * s;
  const caretT = 9 * s;
  const ground = 10 * s;
  const groundR = 5 * s;
  const iconSz = Math.round(22 * s);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      hitSlop={8}
      style={[
        styles.wrap,
        {
          width: MAP_PIN_WIDTH * s,
          height: MAP_PIN_HEIGHT * s,
          transform: [{ scale: pressScale }],
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={variant === 'trail' ? 'Sendero en el mapa' : 'Lugar turístico en el mapa'}>
      <View
        style={[
          styles.bubble,
          {
            width: BUB,
            height: BUB,
            borderRadius: BUB / 2,
            backgroundColor: bubbleBg,
            borderColor: bubbleBorder,
            shadowOpacity,
            elevation,
          },
        ]}>
        <Ionicons
          name={variant === 'trail' ? 'footsteps' : placeIcon}
          size={iconSz}
          color={iconColor}
        />
      </View>
      <View
        style={[
          styles.caret,
          {
            marginTop: -2 * s,
            borderLeftWidth: caretL,
            borderRightWidth: caretL,
            borderTopWidth: caretT,
            borderTopColor: bubbleBg,
          },
        ]}
      />
      <View
        style={[
          styles.ground,
          {
            width: ground,
            height: ground,
            borderRadius: groundR,
            marginTop: -4 * s,
            backgroundColor: iconColor,
            borderColor: bubbleBg,
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  bubble: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  caret: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  ground: {
    borderWidth: 2,
  },
});
