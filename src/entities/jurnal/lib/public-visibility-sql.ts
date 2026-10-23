import { sql } from 'drizzle-orm'
import { jurnal } from '../../../../drizzle/schema'

/**
 * Pertahanan berlapis di kueri publik: jurnal yang custom_fields-nya memuat field berlabel
 * `is_published`/`akses`/`akses_publik` bernilai `false`/`privat`/`private` (huruf dan spasi
 * diabaikan) tidak pernah tampil, apa pun nilai kolom `is_published`. Nilai "false" pada field
 * berlabel lain tidak berpengaruh, dan custom_fields yang bukan array dianggap kosong.
 * Aturan yang sama dengan `isJurnalExplicitlyPrivate` di `visibility.ts`.
 */
export const notExplicitlyPrivateSql = sql`NOT EXISTS (
  SELECT 1
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(${jurnal.custom_fields}) = 'array' THEN ${jurnal.custom_fields} ELSE '[]'::jsonb END
  ) AS field
  WHERE jsonb_typeof(field) = 'object'
    AND lower(btrim(field->>'label')) IN ('is_published', 'akses', 'akses_publik')
    AND lower(btrim(field->>'value')) IN ('false', 'privat', 'private')
)`
