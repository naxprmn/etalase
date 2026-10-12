/**
 * Logika penentuan visibilitas publik jurnal ALAS (ADR-0005, ADR-0007).
 * Jurnal dianggap publik (is_published = true) jika dan hanya jika:
 * 1. is_published tidak disetel false secara eksplisit.
 * 2. custom_fields tidak memuat indikator privat (label 'is_published' / 'akses' / 'akses_publik' dengan value 'false' / 'privat' / 'private').
 * 3. Jika dokumen_pendukung memiliki berkas, minimal 1 berkas harus publik (is_public !== false).
 *    Jika semua dokumen berkas privat, jurnal berstatus privat.
 * 4. Jika dokumen_pendukung kosong dan custom_fields netral, pertahankan status existing (jika update) atau default ke true (jika baru).
 */
export function determineJurnalVisibility(params: {
  is_published?: boolean | null
  custom_fields?: unknown
  dokumen_pendukung?: unknown
  existing_is_published?: boolean | null
}): boolean {
  // 1. Cek nilai explicit boolean is_published
  if (typeof params.is_published === 'boolean') {
    return params.is_published
  }

  // 2. Cek custom_fields (case-insensitive & whitespace trimmed)
  const customFields = Array.isArray(params.custom_fields) ? params.custom_fields : []
  for (const f of customFields) {
    if (!f || !f.label) continue
    const label = String(f.label).trim().toLowerCase()
    const val = String(f.value ?? '').trim().toLowerCase()
    if (label === 'is_published' || label === 'akses' || label === 'akses_publik') {
      if (val === 'false' || val === 'privat' || val === 'private') {
        return false
      }
      if (val === 'true' || val === 'publik' || val === 'public') {
        return true
      }
    }
  }

  // 3. Cek dokumen_pendukung
  const docs = Array.isArray(params.dokumen_pendukung) ? params.dokumen_pendukung : []
  if (docs.length > 0) {
    const hasPublicDoc = docs.some((d: any) => d && d.is_public !== false)
    if (!hasPublicDoc) {
      return false
    }
  }

  // 4. Fallback ke nilai existing jika ada
  if (typeof params.existing_is_published === 'boolean') {
    return params.existing_is_published
  }

  return true
}

/**
 * Memeriksa apakah suatu entri jurnal bersifat privat.
 * Digunakan sebagai guard defense-in-depth di etalase publik dan detail route.
 */
export function isJurnalExplicitlyPrivate(record: {
  is_published?: boolean | null
  custom_fields?: unknown
  dokumen_pendukung?: unknown
}): boolean {
  if (record.is_published === false) return true

  const customFields = Array.isArray(record.custom_fields) ? record.custom_fields : []
  for (const f of customFields) {
    if (!f || !f.label) continue
    const label = String(f.label).trim().toLowerCase()
    const val = String(f.value ?? '').trim().toLowerCase()
    if (label === 'is_published' || label === 'akses' || label === 'akses_publik') {
      if (val === 'false' || val === 'privat' || val === 'private') {
        return true
      }
    }
  }

  const docs = Array.isArray(record.dokumen_pendukung) ? record.dokumen_pendukung : []
  if (docs.length > 0 && docs.every((d: any) => d && d.is_public === false)) {
    return true
  }

  return false
}
