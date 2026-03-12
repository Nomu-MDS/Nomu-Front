import AsyncStorage from '@react-native-async-storage/async-storage';

let authToken: string | null = null;
let hasLoaded = false;
const STORAGE_KEY = 'authToken';

let refreshToken: string | null = null;
let hasLoadedRefresh = false;
const REFRESH_STORAGE_KEY = 'refreshToken';

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

export async function loadRefreshToken(): Promise<string | null> {
  if (hasLoadedRefresh && refreshToken) return refreshToken;
  try {
    const stored = await AsyncStorage.getItem(REFRESH_STORAGE_KEY);
    refreshToken = stored;
    hasLoadedRefresh = true;
    return refreshToken;
  } catch {
    hasLoadedRefresh = true;
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  refreshToken = token;
  try {
    await AsyncStorage.setItem(REFRESH_STORAGE_KEY, token);
  } catch {
    // noop
  }
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export async function clearRefreshToken(): Promise<void> {
  refreshToken = null;
  try {
    await AsyncStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // noop
  }
}


