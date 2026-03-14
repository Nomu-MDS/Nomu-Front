import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadMessageAttachment } from '@/lib/upload';

interface MessageInputProps {
  conversationId: number;
  onSendMessage: (content: string, attachment: string | null) => void;
  onTyping: (isTyping: boolean) => void;
  onReservationRequest?: () => void;
  disabled?: boolean;
}

export function MessageInput({ conversationId, onSendMessage, onTyping, onReservationRequest, disabled = false }: MessageInputProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(12)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 12, duration: 130, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  const toggleMenu = () => (menuVisible ? closeMenu() : openMenu());

  const handleTextChange = (text: string) => {
    setMessage(text);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (text.length > 0) {
      onTyping(true);
      typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000);
    } else {
      onTyping(false);
    }
  };

  const handleSend = () => {
    if ((!message.trim() && !attachment) || disabled || uploading) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onSendMessage(message.trim(), attachment);
    setMessage('');
    setAttachment(null);
    setAttachmentPreview(null);
    onTyping(false);
  };

  const handleImageSelected = async (localUri: string) => {
    setAttachmentPreview(localUri);
    setUploading(true);
    try {
      const minioUrl = await uploadMessageAttachment(localUri, conversationId);
      setAttachment(minioUrl);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'uploader l\'image');
      setAttachmentPreview(null);
      setAttachment(null);
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async () => {
    closeMenu();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await handleImageSelected(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    closeMenu();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await handleImageSelected(result.assets[0].uri);
    }
  };

  const canSend = (message.trim().length > 0 || !!attachment) && !disabled && !uploading;

  return (
    <View style={styles.wrapper}>
      {/* Mini popup animée au-dessus de l'input */}
      {menuVisible && (
        <Animated.View
          style={[
            styles.popup,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            { backgroundColor: colors.surface, borderColor: colors.secondary },
          ]}
        >
          <Pressable style={styles.popupOption} onPress={pickFromCamera}>
            <View style={[styles.popupIcon, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="camera-alt" size={18} color={colors.secondaryText} />
            </View>
            <Text style={[styles.popupText, { color: colors.secondary }]}>Appareil photo</Text>
          </Pressable>

          <View style={[styles.popupSeparator, { backgroundColor: colors.secondary }]} />

          <Pressable style={styles.popupOption} onPress={pickFromLibrary}>
            <View style={[styles.popupIcon, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="photo-library" size={18} color={colors.secondaryText} />
            </View>
            <Text style={[styles.popupText, { color: colors.secondary }]}>Galerie</Text>
          </Pressable>

          <View style={[styles.popupSeparator, { backgroundColor: colors.secondary }]} />

          <Pressable style={styles.popupOption} onPress={() => { closeMenu(); onReservationRequest?.(); }}>
            <View style={[styles.popupIcon, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="calendar-today" size={18} color={colors.secondaryText} />
            </View>
            <Text style={[styles.popupText, { color: colors.secondary }]}>Proposer une activité</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Preview image attachée */}
      {attachmentPreview && (
        <View style={styles.attachmentPreview}>
          <Image source={{ uri: attachmentPreview }} style={styles.previewImage} />
          {uploading ? (
            <View style={[styles.uploadingOverlay]}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <Pressable
              style={[styles.removeButton, { backgroundColor: colors.secondary }]}
              onPress={() => { setAttachment(null); setAttachmentPreview(null); }}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={14} color={colors.secondaryText} />
            </Pressable>
          )}
        </View>
      )}

      {/* Pill de saisie */}
      <View style={[styles.inputPill, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
        <Pressable onPress={toggleMenu} disabled={disabled} style={styles.addButton} hitSlop={8}>
          <View style={[styles.addCircle, { backgroundColor: colors.secondary }]}>
            <MaterialIcons name="add" size={26} color={colors.secondaryText} />
          </View>
        </Pressable>

        <TextInput
          style={[styles.input, { color: colors.secondary, fontFamily: FontFamily.mono }]}
          placeholder="Type Message"
          placeholderTextColor={colors.secondary}
          value={message}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
          editable={!disabled}
          onFocus={menuVisible ? closeMenu : undefined}
        />

        {canSend && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.secondary }]} />
            <Pressable onPress={handleSend} style={styles.sendButton} hitSlop={8}>
              <MaterialIcons name="send" size={20} color={colors.secondary} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    gap: 8,
    zIndex: 10,
    overflow: 'visible',
  },
  // ── Popup ──────────────────────────────────────────────
  popup: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 84,
    left: 4,
    zIndex: 100,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 200,
  },
  popupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  popupIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupText: {
    fontSize: 14,
    fontWeight: '500',
  },
  popupSeparator: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.15,
    marginHorizontal: 14,
  },
  // ── Attachment preview ──────────────────────────────────
  attachmentPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Input pill ──────────────────────────────────────────
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 44,
    paddingVertical: 0,
  },
  divider: {
    width: 1,
    height: 33,
    opacity: 0.3,
    flexShrink: 0,
  },
  sendButton: {
    width: 33,
    height: 33,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
