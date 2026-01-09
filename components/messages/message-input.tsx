// Composant pour la zone de saisie des messages
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MessageInputProps {
  onSendMessage: (content: string, attachment: string | null) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onTyping, disabled = false }: MessageInputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Clear le timeout précédent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (text.length > 0) {
      // Envoyer typing true à chaque frappe
      onTyping(true);

      // Auto-stop après 2 secondes d'inactivité
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else {
      // Texte vide = stop typing immédiat
      onTyping(false);
    }
  };

  const handleSend = () => {
    if ((!message.trim() && !attachment) || disabled) return;

    // Clear le timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    onSendMessage(message.trim(), attachment);
    setMessage('');
    setAttachment(null);
    onTyping(false);
  };

  const pickImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour choisir une photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      // Vérifier la taille (10MB max)
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        Alert.alert('Fichier trop volumineux', "L'image ne doit pas dépasser 10MB");
        return;
      }
      // Convertir en base64 data URL
      if (asset.base64 && asset.mimeType) {
        const base64 = `data:${asset.mimeType};base64,${asset.base64}`;
        setAttachment(base64);
      } else if (asset.uri) {
        // Fallback sur l'URI locale
        setAttachment(asset.uri);
      }
    }
  };

  const pickImageFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la caméra pour prendre une photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64 && asset.mimeType) {
        const base64 = `data:${asset.mimeType};base64,${asset.base64}`;
        setAttachment(base64);
      } else if (asset.uri) {
        setAttachment(asset.uri);
      }
    }
  };

  const handleAttachImage = () => {
    Alert.alert('Ajouter une photo', 'Choisissez une source', [
      { text: 'Appareil photo', onPress: pickImageFromCamera },
      { text: 'Galerie', onPress: pickImageFromLibrary },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const canSend = (message.trim().length > 0 || attachment) && !disabled;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
      {/* Preview de l'image attachée */}
      {attachment && (
        <View style={styles.attachmentPreview}>
          <Image source={{ uri: attachment }} style={styles.previewImage} />
          <Pressable
            style={[styles.removeButton, { backgroundColor: theme.primary }]}
            onPress={() => setAttachment(null)}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Zone de saisie */}
      <View style={styles.inputRow}>
        {/* Bouton d'attachement */}
        <Pressable
          onPress={handleAttachImage}
          disabled={disabled}
          style={styles.attachButton}
          hitSlop={8}
        >
          <MaterialIcons name="image" size={24} color={disabled ? theme.icon : theme.primary} />
        </Pressable>

        {/* Input de message */}
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Votre message..."
            placeholderTextColor={theme.placeholder}
            value={message}
            onChangeText={handleTextChange}
            multiline
            maxLength={2000}
            editable={!disabled}
          />
          <ThemedText style={[styles.charCount, { color: theme.icon }]}>
            {message.length}/2000
          </ThemedText>
        </View>

        {/* Bouton d'envoi */}
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? theme.primary : theme.surface },
          ]}
          hitSlop={8}
        >
          <MaterialIcons name="send" size={20} color={canSend ? '#FFFFFF' : theme.icon} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  attachmentPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  attachButton: {
    padding: 8,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 80,
  },
  charCount: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
