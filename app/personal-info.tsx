import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LANGUAGE_LABELS } from '@/i18n';
import { uploadAvatar } from '@/services/api';
import { useAuthStore } from '@/store/auth-store';
import { useLanguageStore } from '@/store/language-store';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200';

export default function PersonalInfoScreen() {
  const { t } = useTranslation();
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const { language } = useLanguageStore();

  const [name, setName] = useState(user?.full_name ?? '');
  const [editingName, setEditingName] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<TextInput>(null);

  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const divider = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub = colors.icon;
  const headerBg = isDark ? '#1c1c1e' : '#fff';
  const headerBorder = isDark ? '#2a2a2a' : '#EDF0F5';

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/profile');
  }, []);

  const isDirty = name.trim() !== (user?.full_name ?? '') || avatarUri !== null;

  const startEditName = useCallback(() => {
    setEditingName(true);
    setTimeout(() => nameRef.current?.focus(), 50);
  }, []);

  const pickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('personalInfo.permissionTitle'), t('personalInfo.permissionBody'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, [t]);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('common.error'), t('personalInfo.emptyName'));
      return;
    }
    setSaving(true);
    try {
      let newAvatarUrl: string | undefined;
      if (avatarUri && token) {
        newAvatarUrl = await uploadAvatar(token, avatarUri);
      }
      await updateProfile({
        fullName: trimmedName !== user?.full_name ? trimmedName : undefined,
        avatarUrl: newAvatarUrl,
      });
      setAvatarUri(null);
      goBack();
    } catch {
      Alert.alert(t('common.error'), t('personalInfo.saveError'));
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, name, avatarUri, token, user?.full_name, updateProfile, goBack, t]);

  const isVerified = Boolean(user?.email_verified);
  const isPremium = Boolean(user?.is_premium);
  const langLabel = LANGUAGE_LABELS[language];
  const currentAvatar = avatarUri ?? user?.avatar_url ?? DEFAULT_AVATAR;

  const readonlyFields = [
    { icon: 'mail-outline' as const, label: t('personalInfo.email'), value: user?.email ?? '—' },
    {
      icon: (isPremium ? 'star' : 'star-outline') as const,
      label: t('personalInfo.plan'),
      value: isPremium ? t('personalInfo.premium') : 'Free',
      valueColor: isPremium ? colors.tint : undefined,
    },
    { icon: 'language-outline' as const, label: t('personalInfo.language'), value: langLabel },
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: top + 8, backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} style={styles.headerBack} activeOpacity={0.65}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('personalInfo.title')}</ThemedText>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!isDirty || saving}
            style={[styles.saveBtn, { opacity: isDirty && !saving ? 1 : 0.3 }]}
            activeOpacity={0.7}>
            {saving
              ? <ActivityIndicator size="small" color={colors.tint} />
              : <ThemedText style={[styles.saveBtnText, { color: colors.tint }]}>{t('common.save')}</ThemedText>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarOuter}>
            <Image
              source={{ uri: currentAvatar }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {isVerified && !avatarUri && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={11} color="#fff" />
              </View>
            )}
            {/* Camera badge button */}
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.85}
              style={[styles.cameraBadge, { backgroundColor: colors.tint }]}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <ThemedText style={[styles.userName, { color: colors.text }]}>
            {name || user?.full_name}
          </ThemedText>
        </View>

        {/* All fields in one card */}
        <View style={[styles.fieldsCard, { backgroundColor: cardBg }]}>
          {/* Editable name */}
          <TouchableOpacity
            style={styles.fieldRow}
            activeOpacity={editingName ? 1 : 0.65}
            onPress={editingName ? undefined : startEditName}>
            <View style={[styles.fieldIconWrap, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="person-outline" size={20} color={colors.tint} />
            </View>
            <View style={styles.fieldContent}>
              <ThemedText style={[styles.fieldLabel, { color: textSub }]}>{t('personalInfo.fullName')}</ThemedText>
              {editingName ? (
                <TextInput
                  ref={nameRef}
                  value={name}
                  onChangeText={setName}
                  style={[styles.nameInput, { color: colors.text }]}
                  placeholderTextColor={textSub}
                  returnKeyType="done"
                  maxLength={80}
                  autoCorrect={false}
                  onBlur={() => setEditingName(false)}
                  onSubmitEditing={() => setEditingName(false)}
                />
              ) : (
                <ThemedText style={styles.fieldValue} numberOfLines={1}>{name || '—'}</ThemedText>
              )}
            </View>
            {!editingName && (
              <TouchableOpacity onPress={startEditName} activeOpacity={0.6} hitSlop={12} style={styles.pencilBtn}>
                <Ionicons name="create-outline" size={20} color={textSub} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Read-only fields */}
          {readonlyFields.map((field, i) => (
            <View key={field.label}>
              <View style={[styles.divider, { backgroundColor: divider }]} />
              <View style={styles.fieldRow}>
                <View style={[styles.fieldIconWrap, { backgroundColor: colors.tint + '15' }]}>
                  <Ionicons name={field.icon} size={20} color={colors.tint} />
                </View>
                <View style={styles.fieldContent}>
                  <ThemedText style={[styles.fieldLabel, { color: textSub }]}>{field.label}</ThemedText>
                  <ThemedText
                    style={[styles.fieldValue, field.valueColor ? { color: field.valueColor } : null]}
                    numberOfLines={1}>
                    {field.value}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  saveBtn: { height: 36, justifyContent: 'center', paddingHorizontal: 4, minWidth: 44 },
  saveBtnText: { fontSize: 16, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 40, gap: 20 },

  // Avatar
  avatarSection: { alignItems: 'center', gap: 12 },
  avatarOuter: { position: 'relative', width: 96, height: 96 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  verifiedBadge: {
    position: 'absolute',
    top: 4,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#34c759',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },

  // Fields
  fieldsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fieldContent: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 12, fontWeight: '500' },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  nameInput: { fontSize: 15, fontWeight: '600', marginTop: 1, padding: 0 },
  pencilBtn: { padding: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 72 },
});
