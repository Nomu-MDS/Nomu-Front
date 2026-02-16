import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Eye, EyeSlash } from "phosphor-react-native";
import { useState } from "react";
import {
    Alert,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SvgXml } from "react-native-svg";

import { API_BASE_URL } from "@/constants/config";
import { setToken } from "@/lib/session";

const logoBlackSvg = `<svg width="272" height="54" viewBox="0 0 272 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M55.1 38.7C56.4 44.8 60.4 44 60.4 47.5C60.4 49.5 58.7 50 56 50H42C39.2 50 37.5 49.4 37.5 47.4C37.5 44.1 42.7 44.4 41.4 37.9L38.3 22.1C37.1 15.8 35.2 9.6 28.6 9.7C23.3 9.7 18.5 14.5 18.5 23.3V36.1C18.5 45.4 23.3 43.1 23.3 47.5C23.3 49.5 21.7 50 18.9 50H4.6C1.8 50 0 49.4 0 47.4C0 43.1 5 45.4 5 36.1V17.1C5 14.3 3.9 12.5 1.9 11C0.9 10.3 0 9.6 0 8.2C0 6.6 0.8 5.9 3.2 4.8C6.9 3 13.1 1.2 14.7 1.1C16.4 1.1 17.1 2.1 17.1 4.1V10.1C20.9 4.1 27 1 33.4 1C44.8 1 49.1 8.4 51.7 21.6L55.1 38.7Z" fill="#3C3C3B"/>
<path d="M207.9 38.7C209.1 44.8 213.1 44 213.1 47.5C213.1 49.5 211.5 50 208.8 50H194.8C192 50 190.2 49.4 190.2 47.4C190.2 44.1 195.5 44.4 194.2 37.9L191.1 22.1C189.9 15.8 188.8 9.6 181.9 9.7C176.9 9.7 171.9 14.2 171.9 23.3V36.1C171.9 45.4 176.8 43.1 176.8 47.5C176.8 49.5 175.1 50 172.4 50H158.1C155.2 50 153.5 49.4 153.5 47.4C153.5 43.1 158.4 45.4 158.4 36.1V23C158.4 15.6 157.1 9.3 149.9 9.4C144.5 9.5 139.2 14.5 139.2 23.3V36.1C139.2 45.4 144 43.1 144 47.5C144 49.5 142.4 50 139.6 50H125.3C122.5 50 120.7 49.4 120.7 47.4C120.7 43.1 125.7 45.4 125.7 36.1V17.1C125.7 14.3 124.6 12.5 122.6 11C121.6 10.3 120.7 9.6 120.7 8.2C120.7 6.6 121.5 5.9 123.9 4.8C127.6 3 133.8 1.2 135.4 1.1C137.1 1.1 137.8 2.1 137.8 4.1V10.6C141.7 4.2 147.9 1 154.4 1C162.5 1 167.6 4.5 170.1 10.6C173.9 4.3 179.9 1 186.6 1C198.2 1 201.8 8.4 204.5 21.6L207.9 38.7Z" fill="#3C3C3B"/>
<path d="M265.4 17.7V35.1C265.4 42.4 271.2 40.8 271.2 43.7C271.2 45.1 270.2 46.2 268 47.4C265 49 259.4 50.9 256.6 50.9C253.8 50.9 252.6 49.3 252.4 45.1L252.3 42.4C248.2 47.9 241.8 50.9 236.4 50.9C225.6 50.9 219.5 43.6 219.5 30.8V17.7C219.5 10.8 214.7 11.5 214.7 8.5C214.7 7.2 215.4 6.5 217.8 5.4C222 3.4 229.2 1 230.8 1C232.4 1 233.1 1.9 233.1 4L233 17.7V30.1C233 37.7 235.1 42.5 241.1 42.4C246.4 42.3 251.9 36.7 251.9 28.2V17.7C251.9 10.8 247.1 11.5 247.1 8.5C247.1 7.2 247.8 6.5 250.2 5.4C254.4 3.4 261.6 1 263.2 1C264.8 1 265.5 1.9 265.5 4L265.4 17.7Z" fill="#3C3C3B"/>
<path d="M90.8966 0.00900751L90.8966 17.0782C93.2252 17.2404 92.4987 9.23269 92.7409 7.65638C93.1041 5.23336 92.9365 2.50409 93.7003 0L98.3481 0.909758L94.5 17.0782C98.2258 14.5922 98.7114 -0.918766 104.859 4.07139L97.5 18L107.178 4.51276L110.364 7.77348L99.5 19.7985C105.023 18.8617 114.006 6.6025 115.086 16.1955C114.248 15.646 98.8232 20.6362 101.161 22.5008C105.818 22.4287 117.685 13.5293 116.94 21.591L102.083 25.212L116.93 22.5008V26.0767L102.5 28L116.893 28.842L116.94 33.2917L102.5 31.4812C104.859 33.2917 109.032 33.562 110.364 34.1475C112.068 34.8951 114.08 35.0932 116.018 35.1023L115.049 39.561L101.161 34.1475C99.4938 35.6967 112.282 41.3535 112.376 41.9119L109.497 47.6857L107.579 47.1183L98.3574 36.8857L105.576 49.0639L101.161 52.1985L94.5 39.561L98.3574 53.0902L93.7003 54C92.7874 51.1716 93.1134 48.1721 92.7595 45.4429C92.6012 44.2088 92.0795 38.0477 90.8966 39.561L90.9152 54L86.258 53.991L88 39.561C85.4013 39.1106 86.5468 44.6412 86.0159 46.0734C85.5688 47.2804 84.4697 53.1263 83.9015 53.1173L80.6042 51.622L85 37.7955C80.7154 40.2455 79.7659 54.9007 74.1959 49.0459L82.523 36C80.5297 34.1985 73.8699 47.4245 72.7242 47.6857L69.5201 45.4339L80.213 33.2917C77.0927 33.9583 71.206 40.9211 69.0357 42.2902C67.8435 43.0469 67.0238 43.2631 66.7071 41.8218C65.8875 38.0027 80.9095 32.5267 79 30.5C77.2116 30.9864 66.4277 39.1827 64.8536 37.7955L64.3506 34.1475L77.8658 28L63 31.4812L63.0466 26.1308C65.0585 25.9416 75.9004 24.9594 77.8658 24.5C78.5 23 78.5 23.5 78.5 23L63.5216 23.3925C61.1464 16.7359 75.9004 19.4147 79.738 21C81.8803 19.0904 65.133 16.5198 64.8536 16.1775L66.7258 11.6917L82 19.5L67.6572 9.43987L70.8986 6.30525L83.5 19L72.2958 5.4045L76.422 3.603C77.5957 3.8372 79.4213 8.60217 80.213 9.91726C80.9209 11.0882 82.5317 17.5646 85 17.0782L79.738 2.71126L84.3672 1.81051C84.9727 3.80117 85.2987 5.97198 86.0159 7.92661C86.5468 9.36781 86.4106 17.5106 89 17.0782L86.4909 1.3151L90.8966 0.00900751Z" fill="#3C3C3B"/>
</svg>`;

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const formValid = emailValid && password.length >= 6;

  const handleLogin = async () => {
    if (!formValid || isLoading) return;

    setIsLoading(true);
    try {
      console.log("[Login] Connexion en cours...");
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Email ou mot de passe incorrect");
      }

      const data = await response.json();
      const token = data.idToken || data.token || data.access_token;

      if (!token) {
        throw new Error("Token manquant dans la réponse");
      }

      await setToken(token);
      console.log("[Login] Connexion réussie");
      router.replace("/profile");
    } catch (err: any) {
      console.error("[Login] Erreur:", err);
      Alert.alert("Connexion échouée", err.message || "Veuillez réessayer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("@/assets/images/login_page.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.5)", "rgba(0,0,0,1)"]}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <SvgXml xml={logoBlackSvg} width="80%" height={60} />
          </View>

          {/* Sign in text */}
          <Text style={styles.signInText}>Sign in</Text>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <BlurView intensity={20} tint="light" style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </BlurView>

            {/* Password Input */}
            <BlurView intensity={20} tint="light" style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <Eye size={22} color="#FFFFFF" />
                ) : (
                  <EyeSlash size={22} color="#FFFFFF" />
                )}
              </Pressable>
            </BlurView>

            {/* Forgot Password */}
            <Pressable style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password ?</Text>
            </Pressable>
          </View>

          {/* Login Button */}
          <Pressable
            style={[
              styles.loginButton,
              (!formValid || isLoading) && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!formValid || isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Loading..." : "Login"}
            </Text>
          </Pressable>

          {/* Separator */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>Or</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Button */}
          <Pressable style={styles.googleButton}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          {/* Create Account */}
          <Pressable
            style={styles.createAccountButton}
            onPress={() => router.push("/signup")}
          >
            <Text style={styles.createAccountText}>Create an Account</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  signInText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 30,
  },
  form: {
    gap: 24,
    marginBottom: 24,
  },
  inputContainer: {
    borderRadius: 25,
    overflow: "hidden",
    height: 50,
    justifyContent: "center",
    position: "relative",
  },
  input: {
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#FFFFFF",
    height: "100%",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#E9E0D0",
    borderRadius: 25,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3C3C3B",
  },
  gradient: {
    flex: 1,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#FFFFFF",
  },
  separatorText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  googleButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 25,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  createAccountButton: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  createAccountText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textDecorationLine: "underline",
  },
});
