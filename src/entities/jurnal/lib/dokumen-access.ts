type DokumenRecord = { is_public?: boolean } & Record<string, unknown>

function asRecords(docs: unknown): DokumenRecord[] {
  return Array.isArray(docs) ? docs.filter((d): d is DokumenRecord => Boolean(d) && typeof d === 'object') : []
}

/** Dokumen yang boleh dilihat pengguna login biasa: semua kecuali yang ditandai privat. */
export function publicDokumen(docs: unknown): DokumenRecord[] {
  return asRecords(docs).filter((doc) => doc.is_public !== false)
}

export function hasPrivateDokumen(docs: unknown): boolean {
  return asRecords(docs).some((doc) => doc.is_public === false)
}

/** Buang penanda visibilitas sebelum dikirim ke browser. */
export function withoutVisibilityFlag(docs: DokumenRecord[]): Record<string, unknown>[] {
  return docs.map(({ is_public: _isPublic, ...rest }) => rest)
}
