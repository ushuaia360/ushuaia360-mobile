import CustomTabBar from '@/components/custom-tab-bar';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: '/(tabs)',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: '/(tabs)/search',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          href: '/(tabs)/map',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: '/(tabs)/favorites',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: '/(tabs)/profile',
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          href: null, // Oculta del tab bar
        }}
      />
      <Tabs.Screen
        name="trails"
        options={{
          href: null, // Oculta del tab bar
        }}
      />
    </Tabs>
  );
}
