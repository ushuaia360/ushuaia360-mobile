import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const featuredTrails = [
    {
      id: 1,
      name: 'Cerro Martial',
      difficulty: 'Media',
      distance: '7 km',
      time: '3-4 horas',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    },
    {
      id: 2,
      name: 'Laguna Esmeralda',
      difficulty: 'Fácil',
      distance: '9 km',
      time: '4-5 horas',
      image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
    },
    {
      id: 3,
      name: 'Glaciar Martial',
      difficulty: 'Difícil',
      distance: '5 km',
      time: '2-3 horas',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    },
  ];

  const touristPlaces = [
    {
      id: 1,
      name: 'Parque Nacional Tierra del Fuego',
      category: 'Parque Nacional',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    },
    {
      id: 2,
      name: 'Museo del Fin del Mundo',
      category: 'Museo',
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf29a9e?w=800',
    },
    {
      id: 3,
      name: 'Prisión de Ushuaia',
      category: 'Histórico',
      image: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.headerTitle}>
              Ushuaia 360°
            </ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Descubre los mejores senderos y lugares turísticos
            </ThemedText>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={[styles.searchBar, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5' }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <ThemedText style={styles.searchPlaceholder}>Buscar senderos, lugares...</ThemedText>
        </TouchableOpacity>

        {/* Featured Trails */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Senderos Destacados</ThemedText>
            <Link href="/trails" asChild>
              <TouchableOpacity>
                <ThemedText style={[styles.seeAll, { color: colors.tint }]}>Ver todos</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {featuredTrails.map((trail) => (
              <TouchableOpacity key={trail.id} style={styles.trailCard}>
                <View style={styles.trailImageContainer}>
                  <Image
                    source={{ uri: trail.image }}
                    style={styles.trailImage}
                    resizeMode="cover"
                  />
                  <View style={styles.difficultyBadge}>
                    <ThemedText style={styles.difficultyText}>{trail.difficulty}</ThemedText>
                  </View>
                </View>
                <View style={styles.trailInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.trailName}>
                    {trail.name}
                  </ThemedText>
                  <View style={styles.trailDetails}>
                    <View style={styles.trailDetailItem}>
                      <IconSymbol name="figure.walk" size={14} color={colors.icon} />
                      <ThemedText style={styles.trailDetailText}>{trail.distance}</ThemedText>
                    </View>
                    <View style={styles.trailDetailItem}>
                      <IconSymbol name="clock" size={14} color={colors.icon} />
                      <ThemedText style={styles.trailDetailText}>{trail.time}</ThemedText>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tourist Places */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Lugares Turísticos</ThemedText>
            <Link href="/places" asChild>
              <TouchableOpacity>
                <ThemedText style={[styles.seeAll, { color: colors.tint }]}>Ver todos</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
          {touristPlaces.map((place) => (
            <TouchableOpacity key={place.id} style={[styles.placeCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff' }]}>
              <Image
                source={{ uri: place.image }}
                style={styles.placeImage}
                resizeMode="cover"
              />
              <View style={styles.placeInfo}>
                <ThemedText type="defaultSemiBold" style={styles.placeName}>
                  {place.name}
                </ThemedText>
                <ThemedText style={styles.placeCategory}>{place.category}</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.icon} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Accesos Rápidos</ThemedText>
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff' }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.tint + '20' }]}>
                <IconSymbol name="map.fill" size={24} color={colors.tint} />
              </View>
              <ThemedText style={styles.quickActionText}>Mapa</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff' }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.tint + '20' }]}>
                <IconSymbol name="heart.fill" size={24} color={colors.tint} />
              </View>
              <ThemedText style={styles.quickActionText}>Favoritos</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fff' }]}>
              <View style={[styles.quickActionIcon, { backgroundColor: colors.tint + '20' }]}>
                <IconSymbol name="calendar" size={24} color={colors.tint} />
              </View>
              <ThemedText style={styles.quickActionText}>Eventos</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    opacity: 0.6,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  trailCard: {
    width: 280,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  trailImageContainer: {
    position: 'relative',
    height: 180,
  },
  trailImage: {
    width: '100%',
    height: '100%',
  },
  difficultyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  trailInfo: {
    padding: 16,
  },
  trailName: {
    marginBottom: 8,
    fontSize: 18,
  },
  trailDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  trailDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trailDetailText: {
    fontSize: 14,
    opacity: 0.7,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  placeImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 14,
    opacity: 0.6,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
