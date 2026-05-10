import { Alert, Platform } from 'react-native';

type AppAlertButton = {
  text?: string;
  onPress?: (() => void) | (() => Promise<void>);
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * `Alert.alert` en react-native-web no muestra UI en muchos entornos; en nativo delega en `Alert`.
 */
export function appAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons?.length) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    const [b] = buttons;
    void Promise.resolve(b.onPress?.());
    return;
  }

  const cancel = buttons.find((b) => b.style === 'cancel');
  const primary =
    buttons.find((b) => b.style === 'destructive') ?? buttons.find((b) => b !== cancel) ?? buttons[0];

  if (cancel && primary && primary !== cancel) {
    if (window.confirm(text)) {
      void Promise.resolve(primary.onPress?.());
    } else {
      void Promise.resolve(cancel.onPress?.());
    }
    return;
  }

  window.alert(text);
  const last = buttons[buttons.length - 1];
  void Promise.resolve(last?.onPress?.());
}
