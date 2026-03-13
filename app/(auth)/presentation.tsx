import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LogoDiscuss,
  LogoFind,
  LogoMeet,
  LogoWhat,
} from "@/components/ui/NomuLogo";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Slides ────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: "what",
    bg: require("@/assets/images/Nomu_BG_Onboarding_Step_What.jpg"),
    text: "Et si voyager,\nc'était avant tout,\nrencontrer l'autre..?",
    mockup: "what" as const,
  },
  {
    id: "find",
    bg: require("@/assets/images/Nomu_BG_Onboarding_Find.jpg"),
    text: "Trouve un local\nou un voyageur",
    mockup: "find" as const,
  },
  {
    id: "discuss",
    bg: require("@/assets/images/Nomu_BG_Onboarding_Discuss.jpg"),
    text: "Discute et choisis\nune activité que vous\nadorez tous les deux !",
    mockup: "discuss" as const,
  },
  {
    id: "meet",
    bg: require("@/assets/images/Nomu_BG_Onboarding_Meet.jpg"),
    text: "Rencontrez-vous et partagez\nun moment inoubliable",
    mockup: "meet" as const,
  },
];

type Slide = (typeof SLIDES)[number];

// ── Mockup: Find ──────────────────────────────────────────────────────────────
const FIND_CARDS = [
  { name: "Emma Bernard", location: "Clamart, France", tags: ["Surf", "Coffee"] },
  { name: "Lucas Martin", location: "Lyon, France", tags: ["Music", "Nature"] },
  { name: "Sofia Chen", location: "Bordeaux, France", tags: ["Fashion", "Football"] },
];

function FindMockup() {
  return (
    <View style={mk.findWrap}>
      {FIND_CARDS.map((card, i) => (
        <View key={i} style={mk.findCard}>
          <View style={mk.findAvatar} />
          <View style={mk.findContent}>
            <Text style={mk.findName}>{card.name}</Text>
            <Text style={mk.findLoc}>📍 {card.location}</Text>
            <Text style={mk.findBio} numberOfLines={1}>
              J'aime découvrir de nouveaux endroits et partager...
            </Text>
            <View style={mk.findTagRow}>
              {card.tags.map((t) => (
                <View key={t} style={mk.findTagPill}>
                  <Text style={mk.findTagText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Mockup: Discuss ───────────────────────────────────────────────────────────
function DiscussMockup() {
  return (
    <View style={mk.discussCard}>
      <View style={{ gap: 6, alignSelf: "flex-start" }}>
        {["Hey ! Comment tu vas ?", "On se fait une balade à vélo ?"].map(
          (msg) => (
            <View key={msg} style={mk.bubbleIn}>
              <Text style={mk.bubbleInText}>{msg}</Text>
            </View>
          )
        )}
        <Text style={mk.timestamp}>12:15 PM</Text>
      </View>
      <View style={{ gap: 6, alignSelf: "flex-end", alignItems: "flex-end" }}>
        <View style={mk.bubbleOut}>
          <Text style={mk.bubbleOutText}>Super ! On se retrouve !</Text>
        </View>
        <View style={[mk.bubbleOut, { borderRadius: 15 }]}>
          <Text style={[mk.bubbleOutText, { textAlign: "right" }]}>
            {"Je peux aussi amener mon cousin ?\nÇa te va ?"}
          </Text>
        </View>
        <Text style={[mk.timestamp, { textAlign: "right" }]}>12:20 PM</Text>
      </View>
      <View style={{ gap: 6, alignSelf: "flex-start" }}>
        <View style={mk.bubbleIn}>
          <Text style={mk.bubbleInText}>Bien sûr !</Text>
        </View>
        <Text style={mk.timestamp}>12:22 PM</Text>
      </View>
    </View>
  );
}

// ── Mockup: Meet ──────────────────────────────────────────────────────────────
function MeetMockup() {
  return (
    <View style={mk.meetCard}>
      <View style={mk.meetAvatar} />
      <Text style={mk.meetSender}>Amina vous a envoyé une offre</Text>
      <View style={mk.meetReservation}>
        <View style={{ flex: 1 }}>
          <Text style={mk.meetTitle}>Balade à vélo</Text>
          <Text style={mk.meetMeta}>Durée : 2h30</Text>
          <Text style={mk.meetMeta}>Prix : 40,00 €</Text>
        </View>
        <Text style={mk.meetDate}>20.05.2025</Text>
      </View>
      <View style={mk.meetButtons}>
        <View style={mk.meetDecline}>
          <Text style={mk.meetDeclineText}>Refuser</Text>
        </View>
        <View style={mk.meetAccept}>
          <Text style={mk.meetAcceptText}>Accepter</Text>
        </View>
      </View>
    </View>
  );
}

// ── Slide item (animated) ─────────────────────────────────────────────────────
function SlideItem({
  item,
  isVisible,
  isLast,
}: {
  item: Slide;
  isVisible: boolean;
  isLast: boolean;
}) {
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(-24)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(44)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.stagger(160, [
        Animated.parallel([
          Animated.timing(logoFade, {
            toValue: 1,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(logoY, {
            toValue: 0,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(contentFade, {
            toValue: 1,
            duration: 540,
            useNativeDriver: true,
          }),
          Animated.timing(contentY, {
            toValue: 0,
            duration: 580,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(textFade, {
            toValue: 1,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(textY, {
            toValue: 0,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      logoFade.setValue(0);
      logoY.setValue(-24);
      contentFade.setValue(0);
      contentY.setValue(44);
      textFade.setValue(0);
      textY.setValue(32);
    }
  }, [isVisible]);

  return (
    <View style={[s.slide, { width: SW, height: SH }]}>
      <Image
        source={item.bg}
        style={{ position: "absolute", width: SW, height: SH }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.80)", "#000"]}
        locations={[0.16, 0.62, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Logo — ancré en haut */}
      <Animated.View
        style={[
          s.logoWrap,
          { opacity: logoFade, transform: [{ translateY: logoY }] },
        ]}
      >
        {item.mockup === "what" && <LogoWhat />}
        {item.mockup === "find" && <LogoFind />}
        {item.mockup === "discuss" && <LogoDiscuss />}
        {item.mockup === "meet" && <LogoMeet />}
      </Animated.View>

      {/* Mockup content — centré dans la zone médiane */}
      {item.mockup !== "what" && (
        <Animated.View
          style={[
            s.mockupWrap,
            { bottom: isLast ? SH * 0.38 : SH * 0.28 },
            { opacity: contentFade, transform: [{ translateY: contentY }] },
          ]}
        >
          {item.mockup === "find" && <FindMockup />}
          {item.mockup === "discuss" && <DiscussMockup />}
          {item.mockup === "meet" && <MeetMockup />}
        </Animated.View>
      )}

      {/* Titre — ancré en bas */}
      <Animated.View
        style={[
          s.textWrap,
          { bottom: isLast ? 185 : 110 },
          { opacity: textFade, transform: [{ translateY: textY }] },
        ]}
      >
        <Text style={s.text}>{item.text}</Text>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PresentationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? 0);
    },
    []
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 55 }).current;

  const navigateOut = () => {
    if (next === "onboarding") {
      router.replace("/(auth)/onboarding");
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <SlideItem item={item} isVisible={activeIndex === index} isLast={index === SLIDES.length - 1} />
        )}
      />

      {/* Bottom controls — overlaid on top of the FlatList */}
      <View
        style={[
          ctrl.container,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
      >
        {/* Pagination dots */}
        <View style={ctrl.dots}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => flatRef.current?.scrollToIndex({ index: i, animated: true })}>
              <View style={[ctrl.dot, i === activeIndex && ctrl.dotActive]} />
            </Pressable>
          ))}
        </View>

        {/* Commencer — dernier slide seulement */}
        {isLast && (
          <Pressable
            style={({ pressed }) => [ctrl.btn, pressed && { opacity: 0.88 }]}
            onPress={navigateOut}
          >
            <Text style={ctrl.btnText}>Commencer</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  slide: {
    backgroundColor: "#000",
  },
  logoWrap: {
    position: "absolute",
    top: SH * 0.11,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  mockupWrap: {
    position: "absolute",
    top: SH * 0.22,
    left: 12,
    right: 12,
    justifyContent: "center",
    overflow: "hidden",
  },
  textWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 0,
  },
  text: {
    fontFamily: "RocaOne-Bold",
    fontSize: 28,
    color: "#E4DBCB",
    textAlign: "center",
    lineHeight: 38,
  },
});

const mk = StyleSheet.create({
  // ─ Find cards
  findWrap: { gap: 10 },
  findCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#465E8A",
    padding: 12,
    gap: 12,
    height: 108,
    overflow: "hidden",
  },
  findAvatar: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: "rgba(70,94,138,0.25)",
  },
  findContent: { flex: 1, gap: 2 },
  findName: { fontFamily: "RocaOne-Rg", fontSize: 14, color: "#3C3C3B" },
  findLoc: { fontFamily: "Poppins-Regular", fontSize: 11, color: "#465E8A" },
  findBio: { fontFamily: "Poppins-Regular", fontSize: 11, color: "#3C3C3B" },
  findTagRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  findTagPill: {
    backgroundColor: "rgba(60,60,59,0.41)",
    borderRadius: 32,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  findTagText: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
  },

  // ─ Discuss chat
  discussCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#465E8A",
    padding: 16,
    gap: 10,
  },
  bubbleIn: {
    backgroundColor: "rgba(60,60,59,0.41)",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  bubbleInText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#3C3C3B",
    letterSpacing: -0.24,
  },
  bubbleOut: {
    backgroundColor: "#3C3C3B",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-end",
  },
  bubbleOutText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: "#fff",
    letterSpacing: -0.24,
  },
  timestamp: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    color: "#3C3C3B",
  },

  // ─ Meet reservation card
  meetCard: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 2,
    borderColor: "#465E8A",
    borderRadius: 10,
    padding: 15,
    gap: 10,
    width: 230,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  meetAvatar: {
    width: 37,
    height: 37,
    borderRadius: 18.5,
    backgroundColor: "rgba(70,94,138,0.35)",
  },
  meetSender: {
    fontFamily: "RocaOne-Bold",
    fontSize: 12,
    color: "#465E8A",
  },
  meetReservation: {
    backgroundColor: "#465E8A",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  meetTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 14,
    color: "#E4DBCB",
  },
  meetMeta: {
    fontFamily: "Poppins-Regular",
    fontSize: 10,
    color: "#E4DBCB",
    marginTop: 2,
  },
  meetDate: {
    fontFamily: "Poppins-Regular",
    fontSize: 8,
    color: "#E4DBCB",
  },
  meetButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  meetDecline: {
    borderWidth: 1,
    borderColor: "#465E8A",
    borderRadius: 85,
    paddingHorizontal: 20,
    paddingVertical: 6,
    width: 90,
    alignItems: "center",
  },
  meetDeclineText: {
    fontFamily: "RocaOne-Bold",
    fontSize: 10,
    color: "#465E8A",
  },
  meetAccept: {
    backgroundColor: "#465E8A",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 6,
    width: 90,
    alignItems: "center",
  },
  meetAcceptText: {
    fontFamily: "RocaOne-Bold",
    fontSize: 10,
    color: "#fff",
  },
});

const ctrl = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    gap: 14,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(228,219,203,0.3)",
  },
  dotActive: {
    width: 24,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#E4DBCB",
  },
  btn: {
    width: "100%",
    height: 54,
    backgroundColor: "#E4DBCB",
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontFamily: "RocaOne-Bold",
    fontSize: 17,
    color: "#0E224A",
  },
});
