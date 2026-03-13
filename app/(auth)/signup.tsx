import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFonts } from "expo-font";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { FilterBadge } from "@/components/ui/filter-badge";
import { API_BASE_URL } from "@/constants/config";
import { setRefreshToken, setToken } from "@/lib/session";
import { uploadProfilePhoto } from "@/lib/upload";

WebBrowser.maybeCompleteAuthSession();

const googleLogoSvg = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
</svg>`;

// Type pour les intérêts du backend
interface Interest {
  id: number;
  name: string;
  icon: string | null;
  is_active: boolean;
}

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedInterestIds, setSelectedInterestIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // État pour le flux Google signup (token récupéré, pas besoin des étapes 1 et 2)
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // Intérêts chargés depuis l'API
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);

  const [fontsLoaded] = useFonts({
    "RocaOne-Bold":    require("@/assets/fonts/roca/RocaOne-Bold.ttf"),
    'Poppins-Regular':  require('@/assets/fonts/poppins/Poppins-Regular.ttf'),
    'Poppins-Medium':   require('@/assets/fonts/poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('@/assets/fonts/poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold':     require('@/assets/fonts/poppins/Poppins-Bold.ttf'),
  });

  // Charger les intérêts au montage
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/interests`);
        if (response.ok) {
          const data = await response.json();
          setInterests(data);
        }
      } catch (err) {
        console.error("Erreur chargement intérêts:", err);
      } finally {
        setLoadingInterests(false);
      }
    };
    fetchInterests();
  }, []);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const usernameValid = username.trim().length >= 2;
  const passwordValid = password.length >= 6;

  const step1Valid = emailValid && usernameValid && passwordValid;
  const step2Valid = true; // Toujours valide, la photo est optionnelle
  const step3Valid = selectedInterestIds.length > 0;

  const progress = useMemo(() => (step / totalSteps) * 100, [step, totalSteps]);

  const toggleInterest = (interestId: number) => {
    setSelectedInterestIds((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId],
    );
  };

  const pickImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission requise",
        "Autorisez l’accès à la galerie pour choisir une photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setAvatarUrl(result.assets[0]?.uri ?? "");
    }
  };

  const pickImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission requise",
        "Autorisez l’accès à la caméra pour prendre une photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setAvatarUrl(result.assets[0]?.uri ?? "");
    }
  };

  const pickImage = () => {
    Alert.alert("Ajouter une photo", "Choisissez une source", [
      { text: "Appareil photo", onPress: pickImageFromCamera },
      { text: "Galerie", onPress: pickImageFromLibrary },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  const goNext = () => {
    if (step === 1 && !step1Valid) return;
    if (step === 2 && !step2Valid) return;
    setStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const goBack = () => setStep((prev) => Math.max(1, prev - 1));

  const confirmExit = () => {
    Alert.alert(
      "Quitter l’inscription ?",
      "Vous allez revenir à l’écran précédent.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Quitter", style: "destructive", onPress: () => router.back() },
      ],
    );
  };

  const handleGoogleSignup = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_BASE_URL}/auth/google?mobile=1`,
        "nomufront://"
      );
      if (result.type !== "success") return;

      const qs = result.url.split("?")[1] ?? "";
      const getParam = (key: string) => {
        const m = qs.match(new RegExp(`(?:^|&)${key}=([^&]*)`));
        return m ? decodeURIComponent(m[1]) : null;
      };
      const token = getParam("token");
      if (!token) throw new Error("Token manquant");

      await setToken(token);
      const rt = getParam("refreshToken");
      if (rt) await setRefreshToken(rt);

      if (getParam("new") === "1") {
        // Nouveau compte Google → step photo (pré-remplie) puis intérêts
        setGoogleToken(token);
        setIsGoogleSignup(true);
        const googlePhoto = getParam("photo");
        if (googlePhoto) setAvatarUrl(googlePhoto);
        setStep(2);
      } else {
        // Compte existant → connexion directe
        router.replace("/(tabs)/profile");
      }
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible de continuer avec Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!step3Valid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      let token: string;

      if (isGoogleSignup && googleToken) {
        // Flux Google : token déjà obtenu, pas besoin de signup/login
        token = googleToken;
      } else {
        const trimmedEmail = email.trim().toLowerCase();

        // 1. Créer l'utilisateur via /auth/signup
        const signupResponse = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: username.trim(),
            email: trimmedEmail,
            password,
            is_searchable: true,
          }),
        });

        if (!signupResponse.ok) {
          const errorData = await signupResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Erreur lors de la création du compte",
          );
        }

        console.log("[Signup] Compte créé:", trimmedEmail);

        // 2. Auto-login pour obtenir un token valide
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });

        if (!loginResponse.ok) {
          throw new Error(
            "Compte créé mais erreur lors de la connexion automatique",
          );
        }

        const loginData = await loginResponse.json();
        token = loginData.token || loginData.idToken || loginData.access_token;

        if (!token) {
          throw new Error("Token manquant dans la réponse de login");
        }

        await setToken(token);
        if (loginData.refreshToken) await setRefreshToken(loginData.refreshToken);
        console.log("[Signup] Auto-login réussi, token stocké");
      }

      // 3. Uploader l'avatar si l'utilisateur a choisi un fichier local
      if (avatarUrl && !avatarUrl.startsWith("http")) {
        try {
          const uploadedUrl = await uploadProfilePhoto(avatarUrl);
          await fetch(`${API_BASE_URL}/users/profile`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ image_url: uploadedUrl }),
          });
        } catch (uploadErr) {
          console.warn("[Signup] Erreur upload avatar (non bloquant):", uploadErr);
        }
      }

      // 4. Mettre à jour le profil avec les intérêts sélectionnés
      if (selectedInterestIds.length > 0) {
        try {
          const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              interest_ids: selectedInterestIds,
            }),
          });

          if (profileResponse.ok) {
            console.log("[Signup] Profil mis à jour avec les intérêts");
          } else {
            console.warn("[Signup] Erreur mise à jour profil (non bloquant)");
          }
        } catch (profileErr) {
          console.warn("[Signup] Erreur mise à jour profil:", profileErr);
        }
      }

      // 5. Présentation de l'app puis profil
      router.replace("/(tabs)/profile");
    } catch (err: any) {
      console.error("[Signup] Erreur:", err);
      Alert.alert(
        "Erreur",
        err.message || "Une erreur est survenue lors de l'inscription",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E9E0D0" />
      </View>
    );
  }

  const getBackgroundImage = () => {
    if (step === 1) return require("@/assets/images/register_background.png");
    if (step === 2) return require("@/assets/images/pdp_page.jpg");
    return require("@/assets/images/interets_page.jpg");
  };

  return (
    <ImageBackground
      source={getBackgroundImage()}
      style={styles.screen}
      resizeMode="cover"
      imageStyle={{ transform: [{ translateY: -100 }] }}
    >
      <LinearGradient
        colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)", "rgba(0,0,0,1)"]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      >
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
          {/* Barre de progression en haut */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => {
                if (step === 1) router.back();
                else if (isGoogleSignup && step === 2) router.back();
                else setStep(step - 1);
              }}
              hitSlop={12}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back-ios" size={20} color="#E9E0D0" />
            </Pressable>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#E9E0D0" />
            </Pressable>
          </View>

          {/* Contenu avec KeyboardAvoidingView */}
          <KeyboardAvoidingView
            style={styles.contentWrapper}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={
                step === 2 ? styles.scrollContentCenter : styles.scrollContent
              }
              keyboardShouldPersistTaps="handled"
            >
              {step === 1 && (
                <View style={styles.formSection}>
                  <Text style={styles.title}>Create an account</Text>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor="rgba(233, 224, 208, 0.5)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Pseudo"
                      placeholderTextColor="rgba(233, 224, 208, 0.5)"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.input}
                      placeholder="Mot de passe"
                      placeholderTextColor="rgba(233, 224, 208, 0.5)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  {/* Séparateur */}
                  <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>Or</Text>
                    <View style={styles.separatorLine} />
                  </View>

                  {/* Bouton Google */}
                  <Pressable
                    style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
                    onPress={handleGoogleSignup}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator size="small" color="#3C3C3B" />
                    ) : (
                      <>
                        <SvgXml xml={googleLogoSvg} width={20} height={20} />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}

              {step === 2 && (
                <View style={styles.formSection}>
                  <Text style={styles.title}>Create an account</Text>

                  <Pressable style={styles.avatarContainer} onPress={pickImage}>
                    <View style={styles.avatarCircle}>
                      {avatarUrl ? (
                        <Image
                          source={{ uri: avatarUrl }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <>
                          <LinearGradient
                            colors={["rgba(228,219,203,0.18)", "rgba(228,219,203,0.55)"]}
                            style={StyleSheet.absoluteFillObject}
                          />
                          <Text style={styles.avatarPlaceholder}>
                            Add a photo
                          </Text>
                        </>
                      )}
                    </View>
                    <View style={styles.cameraBadge}>
                      <MaterialIcons
                        name="photo-camera"
                        size={24}
                        color="#000"
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setStep(step + 1)}
                    style={styles.skipButton}
                  >
                    <Text style={styles.skipText}>Skip for now</Text>
                  </Pressable>
                </View>
              )}

              {step === 3 && (
                <View style={styles.formSection}>
                  <Text style={styles.title}>Choose your vibe</Text>

                  {loadingInterests ? (
                    <ActivityIndicator size="small" color="#E9E0D0" />
                  ) : (
                    <View style={styles.interestsGrid}>
                      {interests.map((interest) => {
                        const active = selectedInterestIds.includes(interest.id);
                        return (
                          <Pressable
                            key={interest.id}
                            style={[styles.interestTag, active && styles.interestTagActive]}
                            onPress={() => toggleInterest(interest.id)}
                          >
                            <Text style={styles.interestTagText}>{interest.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Bouton en bas */}
              <Pressable
                style={[
                  styles.button,
                  ((step === 1 && !step1Valid) ||
                    (step === 2 && !step2Valid) ||
                    (step === 3 && !step3Valid) ||
                    isSubmitting) &&
                    styles.buttonDisabled,
                ]}
                onPress={() => {
                  if (step < totalSteps) {
                    setStep(step + 1);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid) ||
                  (step === 3 && !step3Valid) ||
                  isSubmitting
                }
              >
                <Text style={styles.buttonText}>
                  {step < totalSteps
                    ? "Next"
                    : isSubmitting
                      ? "Creating..."
                      : "Rejoindre Nomu"}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  screen: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(233, 224, 208, 0.3)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#E9E0D0",
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  scrollContentCenter: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  formSection: {
    gap: 16,
  },
  title: {
    fontSize: 36,
    fontFamily: "RocaOne-Bold",
    fontWeight: "700",
    color: "#E9E0D0",
    marginBottom: 24,
  },
  inputGroup: {
    gap: 0,
  },
  input: {
    backgroundColor: "#3C3C3B69",
    borderWidth: 1.5,
    borderColor: "#465E8A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#E9E0D0",
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  avatarCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#465E8A",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    fontSize: 16,
    color: "#E4DBCB",
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  skipText: {
    fontSize: 14,
    color: "rgba(233, 224, 208, 0.7)",
    textDecorationLine: "underline",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 20,
    right: "30%",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E9E0D0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  interestTag: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "rgba(37,37,39,0.41)",
  },
  interestTagActive: {
    borderColor: "#465E8A",
  },
  interestTagText: {
    fontFamily: "RocaOne-Rg",
    fontSize: 15,
    color: "#E4DBCB",
  },
  button: {
    backgroundColor: "#E9E0D0",
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(233, 224, 208, 0.4)",
  },
  separatorText: {
    fontSize: 14,
    color: "rgba(233, 224, 208, 0.7)",
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3C3C3B",
  },
});
