import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

export type IconSymbolName = ComponentProps<typeof Ionicons>['name'];

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
