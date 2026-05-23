/** Normaliza un teléfono para abrir WhatsApp (wa.me). */
export function phoneToWhatsAppUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}
