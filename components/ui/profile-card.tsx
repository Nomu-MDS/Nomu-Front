import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { memo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface ProfileHit {
  id: number;
  user_id: number;
  name: string;
  location?: string;
  bio?: string;
  biography?: string;
  country?: string;
  city?: string;
  interests?: string[];
  image_url?: string;
}

export interface ProfileCardProps {
  profile: ProfileHit;
  onPress?: () => void;
}

export const ProfileCard = memo(function ProfileCard({
  profile,
  onPress,
}: ProfileCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const displayLocation =
    profile.city && profile.country
      ? `${profile.city}, ${profile.country}`
      : profile.city || profile.country || profile.location || null;

  const displayBio = profile.biography || profile.bio || null;

  const interestsArray = profile.interests ? profile.interests.slice(0, 3) : [];

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
      onPress={onPress}
      android_ripple={{ color: theme.primary + "20" }}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {profile.image_url ? (
          <Image source={{ uri: profile.image_url }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: theme.primary },
            ]}
          >
            <ThemedText style={styles.initials}>{initials}</ThemedText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {profile.name}
          </ThemedText>
          {displayLocation && (
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={14} color={theme.icon} />
              <ThemedText
                style={[styles.location, { color: theme.icon }]}
                numberOfLines={1}
              >
                {displayLocation}
              </ThemedText>
            </View>
          )}
        </View>

        {displayBio && (
          <ThemedText
            style={[styles.bio, { color: theme.icon }]}
            numberOfLines={2}
          >
            {displayBio}
          </ThemedText>
        )}

        {interestsArray.length > 0 && (
          <View style={styles.interestsRow}>
            {interestsArray.map((interest, index) => (
              <View
                key={index}
                style={[
                  styles.interestBadge,
                  {
                    backgroundColor: theme.primary + "15",
                    borderColor: theme.primary + "30",
                  },
                ]}
              >
                <ThemedText
                  style={[styles.interestText, { color: theme.primary }]}
                >
                  {interest}
                </ThemedText>
              </View>
            ))}
            {profile.interests && profile.interests.length > 3 && (
              <ThemedText style={[styles.moreInterests, { color: theme.icon }]}>
                +{profile.interests.length - 3}
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {/* Chevron */}
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={theme.icon}
        style={styles.chevron}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  avatarContainer: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    gap: 6,
  },
  header: {
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  location: {
    fontSize: 13,
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
  },
  interestsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  interestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 11,
    fontWeight: "500",
  },
  moreInterests: {
    fontSize: 12,
    fontWeight: "500",
  },
  chevron: {
    marginLeft: 4,
  },
});
