/** Jadikan teks pencarian literal untuk LIKE/ILIKE: `\`, `%`, dan `_` kehilangan arti khususnya. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
