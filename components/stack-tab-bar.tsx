import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHomeStore } from '@/store/home-store';
import { type Href, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface TabItem {
  name: string;
  path: string;
  icon: IconSymbolName;
  iconFilled: IconSymbolName;
}

/** Altura total que ocupa la tab bar de stack en pantalla (incl. margin inferior). */
export function stackTabBarReserveHeight(bottomInset: number): number {
  const height = Platform.OS === 'ios' ? 88 : 56 + Math.max(bottomInset, 8);
  const marginBottom = Platform.OS === 'ios' ? 10 : 8;
  return height + marginBottom;
}

const STACK_TABS: TabItem[] = [
  { name: 'index', path: '/(tabs)', icon: 'home-outline', iconFilled: 'home' },
  { name: 'search', path: '/(tabs)/search', icon: 'search-outline', iconFilled: 'search' },
  { name: 'map', path: '/(tabs)/map', icon: 'map-outline', iconFilled: 'map' },
  { name: 'favorites', path: '/(tabs)/favorites', icon: 'heart-outline', iconFilled: 'heart' },
  { name: 'profile', path: '/(tabs)/profile', icon: 'person-outline', iconFilled: 'person' },
];

/** Tab bar for stack screens (trail/place detail) — same look as tabs, highlights from pathname. */
export default function StackTabBar() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { searchOpen } = useHomeStore();
  const pathname = usePathname();
  const { bottom: bottomInset } = useSafeAreaInsets();

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (searchOpen) {
      opacity.value = withTiming(0, { duration: 120 });
      translateY.value = withTiming(150, { duration: 180, easing: Easing.out(Easing.exp) });
    } else {
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 250 });
    }
  }, [searchOpen, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const stackMapContext = pathname.includes('/trails/') || pathname.includes('/places/');

  const focusedForPath = (tab: TabItem): boolean => {
    if (stackMapContext) return tab.name === 'map';
    if (tab.path === '/(tabs)') {
      return pathname === '/(tabs)' || pathname === '/' || pathname === '/index' || pathname === '';
    }
    return pathname === tab.path || pathname.startsWith(`${tab.path}/`);
  };

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.background,
          borderTopColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e5e5',
          paddingBottom: Platform.OS === 'ios' ? 28 : Math.max(bottomInset, 8),
          height: Platform.OS === 'ios' ? 88 : 56 + Math.max(bottomInset, 8),
          marginBottom: Platform.OS === 'ios' ? 10 : 8,
        },
        animatedStyle,
      ]}
      pointerEvents={searchOpen ? 'none' : 'auto'}>
      {STACK_TABS.map((tab) => {
        const isFocused = focusedForPath(tab);

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={() => router.push(tab.path as Href)}
            style={styles.tabButton}
            activeOpacity={0.7}>
            <IconSymbol
              size={24}
              name={isFocused ? tab.iconFilled : tab.icon}
              color={isFocused ? colors.tint : colors.tabIconDefault}
            />
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});
