import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function MessagesScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Messages</ThemedText>
      <ThemedText>Vos conversations apparaîtront ici</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
});
