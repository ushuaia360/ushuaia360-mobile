import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TrailImageProps {
  /** Primera imagen disponible (trail.image o trail.images?.[0]) */
  uri: string | null | undefined;
  style?: object;
  contentFit?: 'cover' | 'contain';
}

/**
 * Muestra la imagen del sendero o un placeholder por defecto si no hay imagen o falla la carga.
 */
export default function TrailImage({ uri, style, contentFit = 'cover' }: TrailImageProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [hasError, setHasError] = useState(false);

  const showPlaceholder = !uri || hasError;

  if (showPlaceholder) {
    return (
      <View
        style={[
          styles.placeholder,
          style,
          { backgroundColor: isDark ? '#2a2a2a' : '#E8ECF0' },
        ]}>
        <IconSymbol
          name="image-outline"
          size={40}
          color={isDark ? '#555' : '#9ca3af'}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, style]}
      contentFit={contentFit}
      onError={() => setHasError(true)}
      transition={200}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});
