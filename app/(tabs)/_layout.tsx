import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";

const ICON_SIZE = 22;

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

const ROUTE_ICONS: Record<string, MaterialIconName> = {
  home: "home",
  explore: "explore",
  favorite: "calendar-today",
  messages: "chat-bubble-outline",
  profile: "person-outline",
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, shadows } = useTheme();

  const visibleRoutes = state.routes.filter((r) => r.name !== "index");

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 10 }]}>
      <View style={[styles.pill, shadows.lg, { backgroundColor: colors.surface }]}>
        {visibleRoutes.map((route) => {
          const isFocused = state.routes[state.index].name === route.name;
          const icon = ROUTE_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} style={styles.tabItem} onPress={onPress}>
              {isFocused ? (
                <View style={[styles.activeCircle, { backgroundColor: colors.tabActiveCircle }]}>
                  <MaterialIcons name={icon} size={ICON_SIZE} color={colors.tabActiveIcon} />
                </View>
              ) : (
                <MaterialIcons name={icon} size={ICON_SIZE} color={colors.tabIconDefault} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Accueil" }} />
      <Tabs.Screen name="explore" options={{ title: "Explorer" }} />
      <Tabs.Screen name="favorite" options={{ title: "Réservations" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pill: {
    width: "90%",
    height: 56,
    borderRadius: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  activeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
});
