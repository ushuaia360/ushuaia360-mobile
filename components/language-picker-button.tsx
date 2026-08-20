import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguageStore } from '@/store/language-store';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const LANGUAGES = [
  { code: 'es', flag: '🇦🇷' },
  { code: 'en', flag: '🇺🇸' },
  { code: 'pt', flag: '🇧🇷' },
] as const;

interface LanguagePickerButtonProps {
  style?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  iconColor?: string;
}

export default function LanguagePickerButton({ style, buttonStyle, iconColor }: LanguagePickerButtonProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { language, setLanguage } = useLanguageStore();

  const [sheetVisible, setSheetVisible] = useState(false);
  const overlay = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(260)).current;

  const openSheet = () => {
    setSheetVisible(true);
    Animated.parallel([
      Animated.timing(overlay, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(overlay, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: 260, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setSheetVisible(false);
      cb?.();
    });
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.langBtn, buttonStyle]}
        onPress={openSheet}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('languagePicker.title')}>
        <Ionicons name="language-outline" size={22} color={iconColor ?? colors.tint} />
      </TouchableOpacity>

      {sheetVisible ? (
        <Modal transparent animationType="none" visible={sheetVisible} onRequestClose={() => closeSheet()}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: overlay }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => closeSheet()} />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: isDark ? '#1c1c1e' : '#fff', transform: [{ translateY: sheetY }] },
            ]}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: isDark ? '#fff' : '#11181C' }]}>{t('languagePicker.title')}</Text>
            {LANGUAGES.map((lang, i) => (
              <View key={lang.code}>
                <TouchableOpacity
                  style={styles.option}
                  activeOpacity={0.75}
                  onPress={() => closeSheet(() => setLanguage(lang.code))}>
                  <Text style={styles.optionFlag}>{lang.flag}</Text>
                  <Text style={[styles.optionLabel, { color: isDark ? '#fff' : '#11181C' }]}>
                    {t(`languagePicker.${lang.code}`)}
                  </Text>
                  {language === lang.code && <Ionicons name="checkmark" size={20} color={colors.tint} />}
                </TouchableOpacity>
                {i < LANGUAGES.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]} />
                )}
              </View>
            ))}
          </Animated.View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  langBtn: {
    width: 46,
    height: 46,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'android' ? 'Inter' : undefined,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.5,
    marginBottom: 8,
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  optionFlag: { fontSize: 26 },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'android' ? 'Inter' : undefined,
  },
  divider: { height: StyleSheet.hairlineWidth },
});
