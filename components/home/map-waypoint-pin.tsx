import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

/** Ancla: centro inferior del punto en el mapa */
export const MAP_PIN_WIDTH = 52;
export const MAP_PIN_HEIGHT = 56;

interface Props {
  selected: boolean;
  variant: 'trail' | 'place';
  onPress: () => void;
}

export default function MapWaypointPin({ selected, variant, onPress }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bubbleBg = isDark ? '#2c2c2e' : '#ffffff';
  const bubbleBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)';
  const iconColor =
    variant === 'trail'
      ? Colors[colorScheme ?? 'light'].tint
      : isDark
        ? '#ff9f0a'
        : '#e85d04';
  const scale = selected ? 1.08 : 1;
  const shadowOpacity = selected ? 0.24 : 0.15;
  const elevation = selected ? 11 : 7;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      hitSlop={8}
      style={[styles.wrap, { transform: [{ scale }] }]}
      accessibilityRole="button"
      accessibilityLabel={variant === 'trail' ? 'Sendero en el mapa' : 'Lugar turístico en el mapa'}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleBg,
            borderColor: bubbleBorder,
            shadowOpacity,
            elevation,
          },
        ]}>
        <Ionicons
          name={variant === 'trail' ? 'footsteps' : 'camera'}
          size={22}
          color={iconColor}
        />
      </View>
      <View
        style={[
          styles.caret,
          {
            borderTopColor: bubbleBg,
          },
        ]}
      />
      <View
        style={[
          styles.ground,
          {
            backgroundColor: iconColor,
            borderColor: bubbleBg,
          },
        ]}
      />
    </TouchableOpacity>
  );
}

const BUBBLE = 46;

const styles = StyleSheet.create({
  wrap: {
    width: MAP_PIN_WIDTH,
    height: MAP_PIN_HEIGHT,
    alignItems: 'center',
  },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  caret: {
    marginTop: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  ground: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -4,
    borderWidth: 2,
  },
});
