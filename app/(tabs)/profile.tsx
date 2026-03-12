import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MOCK_USER = {
  name: 'Nombre',
  location: 'Ushuaia, Argentina',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  trails: 4,
  reviews: 2,
  months: 3,
};

const SETTINGS = [
  { icon: 'person-outline',        label: 'Información personal' },
  { icon: 'notifications-outline', label: 'Notificaciones' },
  { icon: 'lock-closed-outline',   label: 'Privacidad y seguridad' },
  { icon: 'help-circle-outline',   label: 'Centro de ayuda' },
  { icon: 'log-out-outline',       label: 'Cerrar sesión', danger: true },
];

export default function ProfileScreen() {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const cardBg    = isDark ? '#1c1c1e' : '#fff';
  const divider   = isDark ? '#2a2a2a' : '#f0f0f0';
  const textSub   = colors.icon;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scroll, { paddingTop: top + 48 }]}>

        {/* ── Profile card ── */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: MOCK_USER.avatar }} style={styles.avatar} />
              <ThemedText style={[styles.userName, { marginTop: 10 }]}>{MOCK_USER.name}</ThemedText>
              <ThemedText style={[styles.userLocation, { color: textSub }]}>{MOCK_USER.location}</ThemedText>
            </View>
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNum}>{MOCK_USER.trails}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSub }]}>Senderos</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: divider }]} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statNum}>{MOCK_USER.reviews}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSub }]}>Reseñas</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: divider }]} />
              <View style={styles.statItem}>
                <ThemedText style={styles.statNum}>{MOCK_USER.months}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: textSub }]}>Meses</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* ── Grid cards ── */}
        <View style={styles.grid}>
          <TouchableOpacity style={[styles.gridCard, { backgroundColor: cardBg, justifyContent: 'space-between' }]} activeOpacity={0.85}>
            <View style={[styles.completedIconWrap, { backgroundColor: '#fff', borderWidth: 2, borderColor: colors.tint, marginTop: 20 }]}>
              <Ionicons name="trail-sign-outline" size={32} color={colors.tint} />
            </View>
            <ThemedText style={styles.gridLabel}>Completados</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gridCard, { backgroundColor: cardBg, justifyContent: 'space-between' }]} activeOpacity={0.85}>
            <View style={styles.favImgs}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200' }}
                style={styles.favImg}
              />
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200' }}
                style={[styles.favImg, styles.favImgOverlap]}
              />
            </View>
            <ThemedText style={styles.gridLabel}>Favoritos</ThemedText>
          </TouchableOpacity>
        </View>

        {/* ── Premium CTA ── */}
        <TouchableOpacity style={[styles.ctaCard, { backgroundColor: cardBg }]} activeOpacity={0.88}>
          <View style={[styles.ctaIcon, { backgroundColor: colors.tint + '18' }]}>
            <Ionicons name="download-outline" size={28} color={colors.tint} />
          </View>
          <View style={styles.ctaText}>
            <ThemedText style={styles.ctaTitle}>Modo sin conexión</ThemedText>
            <ThemedText style={[styles.ctaSubtitle, { color: textSub }]}>
              Descargá senderos para usarlos sin internet
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSub} />
        </TouchableOpacity>

        {/* ── Settings ── */}
        <View style={[styles.settingsCard, { backgroundColor: cardBg }]}>
          {SETTINGS.map(({ icon, label, danger }, i) => (
            <View key={label}>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={label === 'Cerrar sesión' ? () => router.replace('/login') : undefined}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name={icon as any} size={24} color={danger ? '#ff3b30' : colors.text} />
                </View>
                <ThemedText style={[styles.settingLabel, danger && { color: '#ff3b30' }]}>{label}</ThemedText>
                {!danger && <Ionicons name="chevron-forward" size={16} color={textSub} />}
              </TouchableOpacity>
              {i < SETTINGS.length - 1 && <View style={[styles.rowDivider, { backgroundColor: divider }]} />}
            </View>
          ))}
        </View>

        {/* ── Not logged in ── */}
        <View style={styles.authRow}>
          <TouchableOpacity
            style={[styles.authBtn, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/login')}
            activeOpacity={0.85}>
            <ThemedText style={styles.authBtnText}>Iniciar sesión</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.tint }]}
            onPress={() => router.push('/register')}
            activeOpacity={0.85}>
            <ThemedText style={[styles.authBtnText, { color: colors.tint }]}>Registrarse</ThemedText>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 32, fontWeight: '600' },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Profile card
  card: {
    borderRadius: 20,
    padding: 14,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  avatarWrap: { position: 'relative', flex: 1, alignItems: 'center', marginLeft: -20 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flex: 1, gap: 8, paddingLeft: 30, paddingTop: 10 },
  statItem: { gap: 1 },
  statNum: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 13 },
  statDivider: { height: 1 },
  userName: { fontSize: 22, fontWeight: '600', marginBottom: 4 },
  userLocation: { fontSize: 14 },

  // Grid
  grid: { flexDirection: 'row', gap: 12 },
  gridCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    paddingTop: 10,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
    gap: 10,
    alignItems: 'center',
  },
  newBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  newText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  gridImg: { width: '100%', height: 70, borderRadius: 10 },
  gridIconWrap: { width: '100%', height: 70, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  completedIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  favImgs: { flexDirection: 'row', height: 70, marginTop: 20 },
  favImg: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#fff' },
  favImgOverlap: { width: 52, height: 52, borderRadius: 26, marginLeft: -12, marginTop: 4 },
  gridLabel: { fontSize: 17, fontWeight: '600', marginTop: 4 },

  // CTA
  ctaCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
  },
  ctaIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { flex: 1, gap: 0 },
  ctaTitle: { fontSize: 16, fontWeight: '600' },
  ctaSubtitle: { fontSize: 13, marginTop: -1, lineHeight: 17 },

  // Settings
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { flex: 1, fontSize: 15 },
  rowDivider: { height: 1, marginLeft: 66 },

  // Auth
  authRow: { flexDirection: 'row', gap: 12 },
  authBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authBtnText: { fontSize: 15, fontWeight: '500', color: '#fff' },
});
