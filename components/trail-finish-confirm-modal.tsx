import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  /** Si `info`, solo un botón (cerrar). */
  variant?: 'confirm' | 'info';
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Estilo del botón principal (p. ej. destructivo). */
  confirmDestructive?: boolean;
}

export default function TrailFinishConfirmModal({
  visible,
  title,
  message,
  variant = 'confirm',
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDestructive = false,
}: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1c1c1e' : '#fff';
  const sub = isDark ? '#aeaeb2' : '#636366';
  const border = isDark ? '#3a3a3c' : '#e5e5ea';
  const confirmBg = confirmDestructive ? '#ff3b30' : colors.tint;
  const isInfo = variant === 'info';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={isInfo ? onConfirm : onCancel} accessibilityLabel="Cerrar" />
        <View style={[styles.card, { backgroundColor: cardBg }]} accessibilityViewIsModal>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={[styles.message, { color: sub }]}>{message}</ThemedText>
          <View style={[styles.actions, isInfo && styles.actionsSingle]}>
            {!isInfo ? (
              <>
                <Pressable
                  style={[styles.btn, styles.btnSecondary, { borderColor: border }]}
                  onPress={onCancel}>
                  <ThemedText style={[styles.btnSecondaryLabel, { color: colors.text }]}>{cancelLabel}</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary, { backgroundColor: confirmBg }]}
                  onPress={onConfirm}>
                  <ThemedText style={styles.btnPrimaryLabel}>{confirmLabel}</ThemedText>
                </Pressable>
              </>
            ) : (
              <Pressable style={[styles.btn, styles.btnPrimary, styles.btnFull, { backgroundColor: colors.tint }]} onPress={onConfirm}>
                <ThemedText style={styles.btnPrimaryLabel}>{confirmLabel}</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsSingle: {
    flexDirection: 'column',
  },
  btn: {
    flex: 1,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnSecondaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnPrimary: {},
  btnFull: {
    flex: 0,
    width: '100%',
  },
  btnPrimaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
