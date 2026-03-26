import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function Dot({ active }: { active: boolean }) {
  const w = useSharedValue(active ? 20 : 6);
  useEffect(() => {
    w.value = withSpring(active ? 20 : 6, { damping: 20, stiffness: 300, mass: 0.6 });
  }, [active, w]);
  const style = useAnimatedStyle(() => ({
    height: 6,
    width: w.value,
    borderRadius: 3,
    backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.45)',
  }));
  return <Animated.View style={style} />;
}

interface TrailGalleryLightboxProps {
  visible: boolean;
  onClose: () => void;
  uris: string[];
  initialIndex: number;
}

export default function TrailGalleryLightbox({
  visible,
  onClose,
  uris,
  initialIndex,
}: TrailGalleryLightboxProps) {
  const { top, bottom } = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [page, setPage] = useState(initialIndex);

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!uris.length || index < 0 || index >= uris.length) return;
      listRef.current?.scrollToIndex({ index, animated });
    },
    [uris.length],
  );

  useEffect(() => {
    if (!visible) return;
    setPage(Math.min(Math.max(0, initialIndex), Math.max(0, uris.length - 1)));
    const id = requestAnimationFrame(() => {
      scrollToIndex(Math.min(Math.max(0, initialIndex), Math.max(0, uris.length - 1)), false);
    });
    return () => cancelAnimationFrame(id);
  }, [visible, initialIndex, uris.length, scrollToIndex]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SCREEN_W);
    setPage(i);
  }, []);

  if (!uris.length) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}>
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={uris}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumEnd}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              });
            }, 120);
          }}
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Image source={{ uri: item }} style={styles.image} contentFit="contain" transition={0} />
            </View>
          )}
        />

        <View style={[styles.chrome, { paddingTop: top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Cerrar galería">
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {uris.length > 1 && (
          <View style={[styles.dots, { paddingBottom: Math.max(bottom, 16) }]}>
            {uris.map((_, i) => (
              <Dot key={i} active={i === page} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    alignItems: 'center',
  },
});
