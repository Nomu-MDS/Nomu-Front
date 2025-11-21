import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Détection dynamique de l'hôte quand on est en mode Expo (LAN/Tunnel) pour éviter les erreurs réseau.
// On couvre plusieurs champs potentiels selon les versions d'Expo.
function resolveDevHost(): string | null {
  const possibleHostUris: (string | undefined)[] = [
    (Constants as any)?.expoConfig?.hostUri,
    (Constants as any)?.manifest2?.hostUri,
    (Constants as any)?.manifest?.hostUri,
    (Constants as any)?.manifest2?.extra?.metro?.hostname,
  ];
  for (const hostUri of possibleHostUris) {
    if (!hostUri) continue;
    // hostUri peut être "10.25.132.43:8081" ou juste l'hôte.
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') return host;
  }
  return null;
}

// Base URL par plateforme (simulateurs)
const platformDefault = Platform.select({
  ios: 'http://localhost:3001',
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});

// Hôte détecté via Expo (utile pour device physique sur le LAN)
const detectedHost = resolveDevHost();
const detectedBaseUrl = detectedHost ? `http://${detectedHost}:3001` : null;

// Surcharges externes (env > extra > détection > plateforme) avec ajustement pour device physique.
const extraBaseUrl = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
const rawEnvBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined;

// Si l'env force localhost mais qu'on est sur un device (non simulateur) et qu'on a détecté un host LAN, on préfère le host LAN.
const isSimulator = Platform.OS === 'ios' && !detectedHost && rawEnvBaseUrl?.includes('localhost'); // heuristique simple
let chosenEnvBaseUrl = rawEnvBaseUrl;
if (rawEnvBaseUrl && rawEnvBaseUrl.includes('localhost') && detectedBaseUrl && Platform.OS !== 'web') {
  // Sur device physique, 'localhost' pointe vers le device lui-même → remplacement.
  chosenEnvBaseUrl = detectedBaseUrl;
}

export const API_BASE_URL: string = chosenEnvBaseUrl || extraBaseUrl || detectedBaseUrl || platformDefault || 'http://localhost:3001';

if (__DEV__) {
  // Logging debug (une seule fois)
  // eslint-disable-next-line no-console
  console.log('[Config] API_BASE_URL résolue =', API_BASE_URL);
  if (rawEnvBaseUrl) console.log('[Config] Source: EXPO_PUBLIC_API_BASE_URL (original =', rawEnvBaseUrl, ')');
  else if (extraBaseUrl) console.log('[Config] Source: expo.extra.apiBaseUrl');
  else if (detectedBaseUrl) console.log('[Config] Source: host Expo détecté');
  else console.log('[Config] Source: plateforme par défaut');
  if (rawEnvBaseUrl && rawEnvBaseUrl.includes('localhost') && detectedBaseUrl && chosenEnvBaseUrl === detectedBaseUrl) {
    console.log('[Config] Remplacement localhost ->', detectedBaseUrl, '(device physique)');
  }
  console.log('[Config] detectedHost =', detectedHost, 'isSimulatorHeuristic =', isSimulator);
}


