// Simple décodage JWT (sans vérification de signature) pour extraire les claims.
// N'ajoutez PAS de logique de sécurité ici; c'est uniquement un helper d'affichage.

function base64UrlDecode(segment: string): string {
  try {
    // Remplacer caractères URL-safe
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    // Ajouter padding si nécessaire
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    if (typeof atob === 'function') {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(padded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }
    // Fallback Buffer (React Native peut avoir un polyfill)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buf = typeof Buffer !== 'undefined' ? Buffer.from(padded, 'base64').toString('utf8') : '';
    return buf;
  } catch (e) {
    return '';
  }
}

export function decodeJwt(token: string): Record<string, any> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payloadRaw = base64UrlDecode(parts[1]);
  if (!payloadRaw) return null;
  try {
    return JSON.parse(payloadRaw);
  } catch {
    return null;
  }
}
