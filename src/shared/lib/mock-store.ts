export interface MockJurnalItem {
  id: string
  source_id: string
  judul: string
  tanggal_kegiatan: string
  kategori: string
  status: 'draft' | 'rejected' | 'publish_pending' | 'published'
  owner_id: string
  owner_name: string
  submitter?: { id: string; name: string }
  submitted_by?: string
  created_by?: string
  redaksi?: string
  divisi?: string
  ringkasan?: string
  link_publikasi?: string
  dokumentasi?: any[]
  dokumen_pendukung?: any[]
  pihak_terkait?: any[]
  custom_fields?: any[]
  tags?: string[]
  created_at: string
  updated_at?: string
  workflow_notes?: string
  is_published?: boolean
}

const globalForMock = globalThis as unknown as {
  mockJurnals?: MockJurnalItem[]
}

if (!globalForMock.mockJurnals) {
  globalForMock.mockJurnals = []
}

export function getMockJurnals(): MockJurnalItem[] {
  return globalForMock.mockJurnals || []
}

export function addMockJurnal(item: MockJurnalItem): MockJurnalItem {
  if (!globalForMock.mockJurnals) {
    globalForMock.mockJurnals = []
  }
  globalForMock.mockJurnals.unshift(item)
  return item
}

export function getMockJurnalById(id: string): MockJurnalItem | undefined {
  return (globalForMock.mockJurnals || []).find(j => j.id === id || j.source_id === id)
}

export function updateMockJurnal(id: string, updates: Partial<MockJurnalItem>): MockJurnalItem | undefined {
  const item = getMockJurnalById(id)
  if (!item) return undefined
  Object.assign(item, updates, { updated_at: new Date().toISOString() })
  return item
}

export function resetMockJurnals() {
  globalForMock.mockJurnals = []
}
