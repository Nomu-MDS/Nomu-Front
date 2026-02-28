import { API_BASE_URL } from '@/constants/config';
import { getToken } from './session';

interface UploadResponse {
  message: string;
  image_url?: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

/**
 * Upload une photo de profil vers Minio via FormData
 * @param imageUri - URI locale de l'image (file://...)
 * @returns URL Minio de l'image uploadée
 */
export async function uploadProfilePhoto(imageUri: string): Promise<string> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  // Extraire le nom de fichier et le type MIME
  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';

  // Créer le FormData avec le fichier
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await fetch(`${API_BASE_URL}/upload/profile-photo/file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Erreur lors de l\'upload');
  }

  const result: UploadResponse = await response.json();

  if (!result.image_url) {
    throw new Error('URL de l\'image non retournée');
  }

  return result.image_url;
}

/**
 * Supprime la photo de profil
 */
export async function deleteProfilePhoto(): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_BASE_URL}/upload/profile-photo`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Erreur lors de la suppression');
  }
}

/**
 * Upload une pièce jointe pour un message
 * @param imageUri - URI locale de l'image
 * @param conversationId - ID de la conversation
 * @returns URL Minio de l'image uploadée
 */
export async function uploadMessageAttachment(
  imageUri: string,
  conversationId: number
): Promise<string> {
  const token = getToken();
  if (!token) {
    throw new Error('Non authentifié');
  }

  const filename = imageUri.split('/').pop() || 'attachment.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';

  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);
  formData.append('conversation_id', conversationId.toString());

  const response = await fetch(`${API_BASE_URL}/upload/message-attachment/file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Erreur lors de l\'upload');
  }

  const result: UploadResponse = await response.json();

  if (!result.url) {
    throw new Error('URL de l\'image non retournée');
  }

  return result.url;
}
