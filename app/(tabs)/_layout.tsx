import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_BG = "#465E8A";
const INACTIVE_COLOR = "#465E8A";
const ACTIVE_ICON_COLOR = "#E4DBCB";
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

  const visibleRoutes = state.routes.filter((r) => r.name !== "index");

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 10 }]}>
      <View style={styles.pill}>
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
                <View style={styles.activeCircle}>
                  <MaterialIcons name={icon} size={ICON_SIZE} color={ACTIVE_ICON_COLOR} />
                </View>
              ) : (
                <MaterialIcons name={icon} size={ICON_SIZE} color={INACTIVE_COLOR} />
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
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
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
    backgroundColor: ACTIVE_BG,
    justifyContent: "center",
    alignItems: "center",
  },
});
