import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Reemplazá con los IDs reales una vez publicada la app
const IOS_APP_STORE_URL = 'https://apps.apple.com/app/id0000000000';
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ushuaia360.ios';

interface Props {
  title: string;
  message: string;
}

export default function UpdateRequiredModal({ title, message }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { top, bottom } = useSafeAreaInsets();

  const openStore = async () => {
    const url = Platform.OS === 'ios' ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  };

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)' },
      ]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            paddingBottom: Math.max(bottom, 24),
            marginTop: top,
          },
        ]}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2c2c2e' : '#F2F4F7' }]}>
          <Ionicons name="arrow-up-circle-outline" size={52} color={colors.tint} />
        </View>

        <ThemedText style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
        <ThemedText style={[styles.message, { color: colors.icon }]}>{message}</ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={openStore}
          accessibilityRole="button"
          accessibilityLabel="Actualizar la app">
          <Ionicons name="download-outline" size={18} color="#fff" />
          <ThemedText style={styles.btnLabel}>Actualizar ahora</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
