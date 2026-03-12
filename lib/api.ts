import { API_BASE_URL } from '@/constants/config';
import { clearRefreshToken, clearToken, getRefreshToken, getToken, setRefreshToken, setToken } from '@/lib/session';

async function doRefresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new Error('Session expirée');

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) {
    await clearToken();
    await clearRefreshToken();
    throw new Error('Session expirée');
  }

  const data = await res.json();
  await setToken(data.token);
  await setRefreshToken(data.refreshToken);
  return data.token;
}

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  if (!token) throw new Error('Token manquant');

  const url = `${API_BASE_URL}${endpoint}`;
  const makeRequest = (t: string) =>
    fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
        ...options.headers,
      },
    });

  let response = await makeRequest(token);

  if (response.status === 401) {
    try {
      const newToken = await doRefresh();
      response = await makeRequest(newToken);
    } catch {
      throw new Error('Session expirée');
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${response.status}`);
  }

  return response.json();
}
