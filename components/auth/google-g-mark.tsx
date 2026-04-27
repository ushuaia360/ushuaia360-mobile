import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

/** Logo multicolor oficial (PNG 18dp) para botones “Continuar con Google”. */
const GOOGLE_G_URL =
  'https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_18dp.png';

type Props = {
  size?: number;
};

export function GoogleGMark({ size = 22 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={{ uri: GOOGLE_G_URL }}
        style={{ width: size, height: size }}
        accessibilityLabel="Google"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
