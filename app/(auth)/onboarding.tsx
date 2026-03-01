import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "@/constants/config";
import { getToken } from "@/lib/session";

interface Interest {
  id: number;
  name: string;
}

export default function OnboardingScreen() {
  const router = useRouter();

  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/interests`)
      .then((r) => r.json())
      .then(setInterests)
      .catch(() => Alert.alert("Erreur", "Impossible de charger les intérêts"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interest_ids: selected }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      router.replace("/(tabs)/profile");
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder tes intérêts");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Tes centres d'intérêt</Text>
        <Text style={styles.subtitle}>
          Sélectionne au moins un intérêt pour personnaliser ton expérience.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#465E8A" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.tagsRow}>
            {interests.map((interest) => {
              const active = selected.includes(interest.id);
              return (
                <Pressable
                  key={interest.id}
                  style={[styles.tag, active && styles.tagActive]}
                  onPress={() => toggle(interest.id)}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>
                    {interest.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          style={[styles.btn, (selected.length === 0 || saving) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={selected.length === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnText}>Continuer</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E4DBCB",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
  },
  title: {
    fontFamily: "RocaOne-Bold",
    fontSize: 28,
    color: "#0E224A",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "System",
    fontSize: 15,
    color: "#3C3C3B",
    marginBottom: 32,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 40,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "rgba(70,94,138,0.3)",
    backgroundColor: "#fff",
  },
  tagActive: {
    backgroundColor: "#465E8A",
    borderColor: "#465E8A",
  },
  tagText: {
    fontSize: 14,
    color: "#465E8A",
    fontWeight: "500",
  },
  tagTextActive: {
    color: "#fff",
  },
  btn: {
    backgroundColor: "#465E8A",
    borderRadius: 9999,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
