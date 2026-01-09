// Helper pour faciliter la navigation vers une conversation
import { createOrGetConversation } from '@/services/api/conversations';

/**
 * Crée ou récupère une conversation avec un utilisateur et retourne l'ID de la conversation
 *
 * @param otherUserId - L'ID de l'utilisateur avec qui démarrer une conversation
 * @returns L'ID de la conversation (nouvelle ou existante)
 *
 * @example
 * // Dans un composant, pour ajouter un bouton "Contacter" :
 * import { useRouter } from 'expo-router';
 * import { startConversation } from '@/lib/chat-helper';
 *
 * function ContactButton({ userId, userName }) {
 *   const router = useRouter();
 *
 *   const handleContact = async () => {
 *     try {
 *       const conversationId = await startConversation(userId);
 *       router.push(`/chat/${conversationId}`);
 *     } catch (error) {
 *       Alert.alert('Erreur', error.message);
 *     }
 *   };
 *
 *   return <Button label={`Contacter ${userName}`} onPress={handleContact} />;
 * }
 */
export async function startConversation(otherUserId: number): Promise<number> {
  try {
    const { conversation, existed } = await createOrGetConversation({ otherUserId });

    if (existed) {
      console.log('[ChatHelper] Conversation existante récupérée:', conversation.id);
    } else {
      console.log('[ChatHelper] Nouvelle conversation créée:', conversation.id);
    }

    return conversation.id;
  } catch (error: any) {
    console.error('[ChatHelper] Erreur:', error);
    throw error;
  }
}
