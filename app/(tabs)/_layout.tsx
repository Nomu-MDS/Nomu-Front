import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { Compass, Heart, House, ChatCircle, User } from 'phosphor-react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ICON_SIZE = 24;

type PhosphorIcon = typeof Compass;

interface TabIconProps {
  focused: boolean;
  color: string;
  Icon: PhosphorIcon;
}

function TabIcon({ focused, color, Icon }: TabIconProps) {
  return (
    <Icon
      size={ICON_SIZE}
      color={color}
      weight={focused ? 'fill' : 'regular'}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Compass} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorite"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Heart} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={House} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={ChatCircle} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={User} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
