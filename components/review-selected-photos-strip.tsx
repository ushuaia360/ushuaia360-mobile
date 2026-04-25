import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export type ReviewSelectedPhotosStripProps = {
  value: string[];
  onChange: (uris: string[]) => void;
  disabled?: boolean;
  isDark: boolean;
};

/** Miniaturas de fotos elegidas (sin botón de agregar; el icono va junto al texto). */
export default function ReviewSelectedPhotosStrip({
  value,
  onChange,
  disabled,
  isDark,
}: ReviewSelectedPhotosStripProps) {
  if (value.length === 0) return null;

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {value.map((uri, idx) => (
        <View key={`${uri}-${idx}`} style={styles.thumbWrap}>
          <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
          <TouchableOpacity
            style={[styles.removeBtn, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
            onPress={() => removeAt(idx)}
            disabled={disabled}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Quitar foto">
            <Ionicons name="close-circle" size={22} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#e5e5ea',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 12,
  },
});
