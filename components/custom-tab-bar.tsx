import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHomeStore } from '@/store/home-store';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect } from 'react';
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
  icon: IconSymbolName;
  iconFilled: IconSymbolName;
}

const tabs: TabItem[] = [
  { name: 'index', icon: 'home-outline', iconFilled: 'home' },
  { name: 'search', icon: 'search-outline', iconFilled: 'search' },
  { name: 'map', icon: 'map-outline', iconFilled: 'map' },
  { name: 'favorites', icon: 'heart-outline', iconFilled: 'heart' },
  { name: 'profile', icon: 'person-outline', iconFilled: 'person' },
];

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { searchOpen } = useHomeStore();
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
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const tab = tabs.find((t) => t.name === route.name);
        if (!tab) return null;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as any).tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
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
