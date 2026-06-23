const LOWERCASE_WORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'e', 'o', 'u',
  'a', 'en', 'con', 'por', 'para', 'al', 'lo', 'le', 'se', 'su', 'sus',
]);

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i) =>
      i === 0 || !LOWERCASE_WORDS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(' ');
}
