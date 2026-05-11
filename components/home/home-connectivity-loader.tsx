import { ThemedView } from '@/components/themed-view';
import { Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOADER_SIZE = 48;
const STROKE_WIDTH = 3.5;
const R = (LOADER_SIZE - STROKE_WIDTH) / 2;
const CIRC = 2 * Math.PI * R;
/** Arco visible (~1/5 del vuelta) */
const ARC_LEN = CIRC * 0.22;

function BrandCircularSpinner({ tint, trackColor }: { tint: string; trackColor: string }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const half = LOADER_SIZE / 2;

  return (
    <Animated.View style={[styles.spinnerWrap, { transform: [{ rotate }] }]} accessibilityElementsHidden>
      <Svg width={LOADER_SIZE} height={LOADER_SIZE}>
        <Circle cx={half} cy={half} r={R} stroke={trackColor} strokeWidth={STROKE_WIDTH} fill="none" />
        <Circle
          cx={half}
          cy={half}
          r={R}
          stroke={tint}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={`${ARC_LEN} ${CIRC}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${half}, ${half}`}
        />
      </Svg>
    </Animated.View>
  );
}

/** Pantalla intermedia mientras se comprueba alcance al API (evita flash de «sin conexión» al arranque). */
export default function HomeConnectivityLoader() {
  const { top, bottom } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const trackColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(63, 169, 245, 0.22)';

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000' : '#fff', paddingTop: top + 24, paddingBottom: bottom + 24 },
      ]}>
      <View style={styles.inner} accessibilityRole="progressbar" accessibilityLabel="Cargando">
        <BrandCircularSpinner tint={Palette.primary} trackColor={trackColor} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerWrap: {
    width: LOADER_SIZE,
    height: LOADER_SIZE,
  },
});
