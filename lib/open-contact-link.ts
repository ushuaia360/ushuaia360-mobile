import { Linking } from "react-native";

/** Convierte un contacto libre (URL, teléfono, @red social) en URL para Linking.openURL. */
export function contactLinkToOpenUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1).replace(/^@/, "");
    if (handle) return `https://instagram.com/${handle}`;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  const looksLikePhone =
    digitsOnly.length >= 8 && /^[\d\s+().-]+$/.test(trimmed);
  if (looksLikePhone) {
    return `tel:${digitsOnly}`;
  }

  if (!/\s/.test(trimmed) && trimmed.includes(".")) {
    return `https://${trimmed}`;
  }

  return null;
}

export async function openContactLink(raw: string): Promise<boolean> {
  const url = contactLinkToOpenUrl(raw);
  if (!url) return false;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
