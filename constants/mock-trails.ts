export type Difficulty = 'Fácil' | 'Media' | 'Difícil';

export interface Trail {
  id: string;
  name: string;
  difficulty: Difficulty;
  distance: string;
  distanceKm: number;
  duration: string;
  elevationGain: string;
  type: string;
  image: string;
  description: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
}

// Centro de Ushuaia: -54.8019, -68.3030
export const USHUAIA_REGION = {
  latitude: -54.8019,
  longitude: -68.303,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export const MOCK_TRAILS: Trail[] = [
  {
    id: '1',
    name: 'Cerro Martial',
    difficulty: 'Media',
    distance: '7 km',
    distanceKm: 7,
    duration: '3-4 hs',
    elevationGain: '520 m',
    type: 'Trekking',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    description: 'Sendero clásico con vistas panorámicas de la ciudad y el Canal Beagle.',
    featured: true,
    rating: 4.8,
    reviewCount: 234,
    coordinate: { latitude: -54.7701, longitude: -68.3342 },
  },
  {
    id: '2',
    name: 'Laguna Esmeralda',
    difficulty: 'Fácil',
    distance: '9 km',
    distanceKm: 9,
    duration: '4-5 hs',
    elevationGain: '250 m',
    type: 'Senderismo',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
    description: 'Laguna glaciar de aguas turquesas rodeada de bosque subantártico.',
    featured: true,
    rating: 4.9,
    reviewCount: 412,
    coordinate: { latitude: -54.7450, longitude: -68.2100 },
  },
  {
    id: '3',
    name: 'Glaciar Martial',
    difficulty: 'Difícil',
    distance: '5 km',
    distanceKm: 5,
    duration: '2-3 hs',
    elevationGain: '680 m',
    type: 'Trekking',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    description: 'Acceso al glaciar con vistas únicas sobre la ciudad de Ushuaia.',
    featured: true,
    rating: 4.6,
    reviewCount: 189,
    coordinate: { latitude: -54.7620, longitude: -68.3400 },
  },
  {
    id: '4',
    name: 'Laguna de los Témpanos',
    difficulty: 'Media',
    distance: '12 km',
    distanceKm: 12,
    duration: '5-6 hs',
    elevationGain: '380 m',
    type: 'Trekking',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    description: 'Sendero en el interior del Parque Nacional con avistamiento de fauna.',
    featured: true,
    rating: 4.7,
    reviewCount: 156,
    coordinate: { latitude: -54.8300, longitude: -68.5500 },
  },
  {
    id: '5',
    name: 'Cerro Guanaco',
    difficulty: 'Difícil',
    distance: '14 km',
    distanceKm: 14,
    duration: '6-8 hs',
    elevationGain: '970 m',
    type: 'Trekking',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
    description: 'Una de las cumbres más desafiantes del Parque Nacional Tierra del Fuego.',
    featured: false,
    rating: 4.5,
    reviewCount: 87,
    coordinate: { latitude: -54.8600, longitude: -68.6200 },
  },
  {
    id: '6',
    name: 'Costera Parque Nacional',
    difficulty: 'Fácil',
    distance: '6 km',
    distanceKm: 6,
    duration: '2-3 hs',
    elevationGain: '80 m',
    type: 'Senderismo',
    image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800',
    description: 'Recorrido costero por la orilla del Lago Roca con vistas al Canal Beagle.',
    featured: false,
    rating: 4.4,
    reviewCount: 321,
    coordinate: { latitude: -54.8750, longitude: -68.5900 },
  },
];
