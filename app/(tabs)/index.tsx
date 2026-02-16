import { getTokenAsync } from '@/lib/session';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ImageBackground, 
  Pressable, 
  Text, 
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';

const { width } = Dimensions.get('window');

const logoSvg = `<svg width="311" height="62" viewBox="0 0 311 62" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M63.0546 45.1555C64.5435 52.1358 69.1178 51.2186 69.1178 55.2268C69.1178 57.5139 67.1703 58.0857 64.085 58.0857H48.0637C44.8595 58.0857 42.912 57.4007 42.912 55.1079C42.912 51.3319 48.862 51.6772 47.3731 44.2383L43.8235 26.1564C42.4478 18.944 40.2739 11.8505 32.7218 11.9637C26.6587 11.9637 21.1616 17.4551 21.1616 27.5264V42.1777C21.1616 52.8208 26.653 50.1883 26.653 55.2211C26.653 57.5082 24.8244 58.08 21.6202 58.08H5.26493C2.06068 58.08 0 57.395 0 55.1022C0 50.1826 5.72349 52.8151 5.72349 42.172V20.4273C5.72349 17.223 4.4667 15.1623 2.17391 13.447C1.03034 12.6431 0 11.8449 0 10.2427C0 8.41416 0.917117 7.61027 3.66281 6.35348C7.8974 4.29845 14.9909 2.23777 16.8251 2.12455C18.7726 2.12455 19.5708 3.26811 19.5708 5.55525V12.4223C23.9186 5.56091 30.8989 2.01132 38.2245 2.01132C51.268 2.01132 56.1933 10.4805 59.1654 25.5846L63.0546 45.1555Z" fill="#E9E0D0" style="mix-blend-mode:lighten"/>
<path d="M101 37C104.314 37 107 34.3137 107 31C107 27.6863 104.314 25 101 25C97.6863 25 95 27.6863 95 31C95 34.3137 97.6863 37 101 37Z" fill="#E9E0D0" style="mix-blend-mode:lighten"/>
<path d="M111.771 1.19888L114.722 1.1178C115.17 1.53333 111.852 9.41834 115.739 11.8001C118.955 13.7764 125.396 6.76297 126.912 10.7359C127.675 14.6784 121.967 13.7764 120.329 17.3236C116.787 25.0059 126.882 25.1782 132 23.3945V27.4383C130.433 27.2052 122.14 27.6917 121.794 28.9991C120.634 33.4281 126.719 36.0429 130.301 36.5395L130.982 39.5901C127.36 39.0834 124.46 37.7861 120.919 39.6915C118.873 46.4211 128.754 46.1171 124.389 51.7318C122.506 49.796 117.184 46.3502 114.671 48.1238C110.641 53.0494 122.119 58.5831 112.656 58.4108C111.934 51.7014 103.956 47.0089 102.715 55.4818C102.236 58.7351 106.235 62.8195 100.496 61.8567C100.995 48.8434 91.9895 45.0225 90.3207 59.8297L86.2912 58.7756L88.2856 46.6643C84.0525 44.6069 80.1553 53.1 77.764 52.6541L75.098 50.2116C86.7796 43.2995 85.4059 35.0699 71.0176 40.5935L71.1295 36.6611C84.1441 34.1274 84.8869 28.1579 70 29.4552L71.1193 25.4924L78.3542 25.4316C82.9129 20.4046 78.1405 17.577 74.0804 14.7696L76.5938 12.4386C79.8398 15.0331 82.689 17.2831 87.1764 16.1885C90.3512 13.1176 81.6104 5.01976 85.7722 4.14815C88.0312 3.67181 91.8267 14.1716 96.4973 10.7967C99.0514 8.95213 96.0597 2.84074 96.4362 0.0941647C102.247 -1.04095 100.211 8.44538 105.096 9.25618C110.306 10.1176 110.479 4.86773 111.771 1.18874V1.19888ZM96.1411 18.5499C83.0044 21.5499 87.4105 47.5765 105.625 42.1644C120.522 37.7456 113.979 14.4757 96.1411 18.5499Z" fill="#E9E0D0" style="mix-blend-mode:lighten"/>
<path d="M237.918 45.1556C239.294 52.1359 243.868 51.2187 243.868 55.2269C243.868 57.514 242.04 58.0858 238.949 58.0858H222.928C219.723 58.0858 217.663 57.4008 217.663 55.108C217.663 51.332 223.726 51.6773 222.243 44.2385L218.693 26.1565C217.317 18.9441 216.06 11.8506 208.163 11.9639C202.44 11.9639 196.722 17.1156 196.722 27.5265V42.1778C196.722 52.8209 202.332 50.1884 202.332 55.2212C202.332 57.5083 200.385 58.0801 197.299 58.0801H180.933C177.615 58.0801 175.668 57.3951 175.668 55.1023C175.668 50.1827 181.278 52.8152 181.278 42.1721V27.1812C181.278 18.712 179.789 11.5053 171.552 11.6185C165.37 11.7317 159.307 17.4552 159.307 27.5265V42.1778C159.307 52.8209 164.798 50.1884 164.798 55.2212C164.798 57.5083 162.97 58.0801 159.765 58.0801H143.399C140.194 58.0801 138.134 57.3951 138.134 55.1023C138.134 50.1827 143.857 52.8152 143.857 42.1721V20.4274C143.857 17.2231 142.6 15.1624 140.308 13.4471C139.164 12.6432 138.134 11.845 138.134 10.2428C138.134 8.41427 139.051 7.61037 141.797 6.35358C146.031 4.2929 153.125 2.23222 154.959 2.11899C156.906 2.11899 157.705 3.26256 157.705 5.54969V12.9885C162.166 5.66292 169.265 2.00011 176.704 2.00011C185.971 2.00011 191.808 6.00825 194.672 12.9885C199.02 5.77614 205.887 2.00011 213.553 2.00011C226.828 2.00011 230.949 10.4693 234.035 25.5734L237.924 45.1442L237.918 45.1556Z" fill="#E9E0D0" style="mix-blend-mode:lighten"/>
<path d="M303.724 21.1237V41.0342C303.724 49.3902 310.359 47.5559 310.359 50.8734C310.359 52.4755 309.216 53.7323 306.696 55.108C303.266 56.9366 296.857 59.1161 293.653 59.1161C290.449 59.1161 289.073 57.2876 288.847 52.4812L288.733 49.3902C284.04 55.6854 276.715 59.1161 270.538 59.1161C258.18 59.1161 251.199 50.7602 251.199 36.1146V21.1237C251.199 13.2263 245.708 14.0302 245.708 10.5938C245.708 9.10494 246.512 8.3067 249.258 7.04425C254.064 4.75712 262.301 2.01143 264.135 2.01143C265.97 2.01143 266.768 3.04177 266.768 5.44213L266.655 21.118V35.3107C266.655 44.0063 269.061 49.5034 275.922 49.3845C281.985 49.2713 288.28 42.8628 288.28 33.1311V21.1124C288.28 13.215 282.789 14.0189 282.789 10.5825C282.789 9.09361 283.593 8.29538 286.339 7.03293C291.145 4.7458 299.382 2.00011 301.216 2.00011C303.051 2.00011 303.849 3.03045 303.849 5.4308L303.736 21.1067L303.724 21.1237Z" fill="#E9E0D0" style="mix-blend-mode:lighten"/>
</svg>`;

export default function HomeScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'RocaOne-Bold': require('@/assets/fonts/roca/RocaOne-Bold.ttf'),
  });

  useEffect(() => {
    (async () => {
      const t = await getTokenAsync();
      setToken(t);
      setLoaded(true);
      console.log('Home token present after async load:', !!t);
      
      // Si l'utilisateur est connecté, rediriger vers la page home
      if (t) {
        router.replace('/home');
      }
    })();
  }, []);

  if (!loaded || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E9E0D0" />
      </View>
    );
  }

  // Page d'accueil pour utilisateurs non connectés
  if (!token) {
    return (
      <ImageBackground
        source={require('@/assets/images/basic_page.png')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Dégradé transparent en haut, foncé en bas */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
          locations={[0, 0.4, 1]}
          style={styles.gradient}
        >
          <View style={styles.container}>
            {/* Logo en haut */}
            <View style={styles.logoContainer}>
              <SvgXml xml={logoSvg} width={width * 0.8} height={(width * 0.8) * (62 / 311)} />
            </View>

            {/* Section texte et boutons en bas */}
            <View style={styles.bottomSection}>
              {/* Texte au-dessus des boutons */}
              <View style={styles.textContainer}>
                <Text style={styles.heroText}>Meet</Text>
                <Text style={styles.heroText}>Share</Text>
                <Text style={styles.heroText}>Write a new chapter</Text>
              </View>

              {/* Boutons */}
              <View style={styles.buttonContainer}>
                <Pressable
                  style={styles.signInButton}
                  onPress={() => router.push('/login')}
                >
                  <BlurView intensity={30} style={styles.blurButton}>
                    <Text style={styles.signInText}>Sign in</Text>
                  </BlurView>
                </Pressable>

                <Pressable
                  style={styles.createAccountButton}
                  onPress={() => router.push('/signup')}
                >
                  <Text style={styles.createAccountText}>Create an account</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    );
  }

  // Si connecté, cette page ne devrait pas s'afficher (redirection dans useEffect)
  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  bottomSection: {
    width: '100%',
    gap: 32,
  },
  textContainer: {
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  heroText: {
    fontSize: 30,
    fontFamily: 'RocaOne-Bold',
    fontWeight: '700',
    color: '#E9E0D0',
    lineHeight: 45,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 50,
  },
  signInButton: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  signInText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E9E0D0',
  },
  createAccountButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#E9E0D0',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});
