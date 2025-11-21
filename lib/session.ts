import AsyncStorage from '@react-native-async-storage/async-storage';

let authToken: string | null = null;
let hasLoaded = false;
const STORAGE_KEY = 'authToken';

export async function loadToken(): Promise<string | null> {
  if (hasLoaded && authToken) return authToken;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    authToken = stored;
    hasLoaded = true;
    return authToken;
  } catch (e) {
    hasLoaded = true;
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  authToken = token;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Ignorer échec de persistance pour l'instant
  }
}

export function getToken(): string | null {
  return authToken;
}

export async function getTokenAsync(): Promise<string | null> {
  if (!hasLoaded) {
    await loadToken();
  }
  return authToken;
}

export async function clearToken(): Promise<void> {
  authToken = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}


