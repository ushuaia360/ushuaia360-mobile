import CustomTabBar from '@/components/custom-tab-bar';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
        animation: 'none',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: '/(tabs)',
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          href: '/(tabs)/home',
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          href: '/(tabs)/favorites',
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          href: '/(tabs)/downloads',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null, // Oculta del tab bar (se usa la búsqueda del Home)
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="completed-trails"
        options={{
          href: null,
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
