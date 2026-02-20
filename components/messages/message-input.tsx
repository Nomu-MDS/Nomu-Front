import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const BLUE = '#465E8A';
const WHITE = '#FFFFFF';

interface MessageInputProps {
  onSendMessage: (content: string, attachment: string | null) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onTyping, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
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
    if ((!message.trim() && !attachment) || disabled) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onSendMessage(message.trim(), attachment);
    setMessage('');
    setAttachment(null);
    onTyping(false);
  };

  const pickFromCamera = async () => {
    closeMenu();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8, base64: true });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setAttachment(a.base64 && a.mimeType ? `data:${a.mimeType};base64,${a.base64}` : a.uri);
    }
  };

  const pickFromLibrary = async () => {
    closeMenu();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8, base64: true });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      setAttachment(a.base64 && a.mimeType ? `data:${a.mimeType};base64,${a.base64}` : a.uri);
    }
  };

  const canSend = (message.trim().length > 0 || !!attachment) && !disabled;

  return (
    <View style={styles.wrapper}>
      {/* Mini popup animée au-dessus de l'input */}
      {menuVisible && (
        <Animated.View
          style={[
            styles.popup,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Pressable style={styles.popupOption} onPress={pickFromCamera}>
            <View style={styles.popupIcon}>
              <MaterialIcons name="camera-alt" size={18} color={WHITE} />
            </View>
            <Text style={styles.popupText}>Appareil photo</Text>
          </Pressable>

          <View style={styles.popupSeparator} />

          <Pressable style={styles.popupOption} onPress={pickFromLibrary}>
            <View style={styles.popupIcon}>
              <MaterialIcons name="photo-library" size={18} color={WHITE} />
            </View>
            <Text style={styles.popupText}>Galerie</Text>
          </Pressable>

          <View style={styles.popupSeparator} />

          <Pressable style={styles.popupOption} onPress={closeMenu}>
            <View style={styles.popupIcon}>
              <MaterialIcons name="calendar-today" size={18} color={WHITE} />
            </View>
            <Text style={styles.popupText}>Réservation</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Preview image attachée */}
      {attachment && (
        <View style={styles.attachmentPreview}>
          <Image source={{ uri: attachment }} style={styles.previewImage} />
          <Pressable style={styles.removeButton} onPress={() => setAttachment(null)} hitSlop={8}>
            <MaterialIcons name="close" size={14} color={WHITE} />
          </Pressable>
        </View>
      )}

      {/* Pill de saisie */}
      <View style={styles.inputPill}>
        <Pressable onPress={toggleMenu} disabled={disabled} style={styles.addButton} hitSlop={8}>
          <View style={styles.addCircle}>
            <MaterialIcons name="add" size={26} color={WHITE} />
          </View>
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Type Message"
          placeholderTextColor={BLUE}
          value={message}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
          editable={!disabled}
          onFocus={menuVisible ? closeMenu : undefined}
        />

        {canSend && (
          <>
            <View style={styles.divider} />
            <Pressable onPress={handleSend} style={styles.sendButton} hitSlop={8}>
              <MaterialIcons name="send" size={20} color={BLUE} />
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
  },
  // ── Popup ──────────────────────────────────────────────
  popup: {
    alignSelf: 'flex-start',
    marginLeft: 4,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BLUE,
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
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupText: {
    fontSize: 14,
    fontWeight: '500',
    color: BLUE,
  },
  popupSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BLUE,
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
    backgroundColor: BLUE,
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
    borderColor: BLUE,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: WHITE,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontSize: 14,
    color: BLUE,
    maxHeight: 44,
    paddingVertical: 0,
  },
  divider: {
    width: 1,
    height: 33,
    backgroundColor: BLUE,
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
