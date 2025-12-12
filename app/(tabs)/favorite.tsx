import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function FavoriteScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Favoris</ThemedText>
      <ThemedText>Vos favoris apparaîtront ici</ThemedText>
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
