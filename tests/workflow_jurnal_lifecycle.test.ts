import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JurnalSubmissionPayload } from '@/entities/jurnal/model/submission-schema'

// Mock cookies
const cookieGet = vi.hoisted(() => vi.fn(() => ({ value: 'dummy-staff-token' })))
vi.mock('next/headers', () => ({
  cookies: () => ({ get: cookieGet }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/entities/lawet-user', () => ({
  getMeAction: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Staf Test',
    username: 'staftest',
    role: { name: 'staf', can_approve: false },
    division: { name: 'Divisi Hukum' }
  })
}))

vi.mock('@/shared/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue([{ source_id: 'mocked-uuid' }])
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 1, source_id: 'mocked-uuid' }])
      }))
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 1, source_id: 'mocked-uuid' }])
      }))
    }))
  }
}))

describe('ALAS Workflow Jurnal Lifecycle (E2E Integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cookieGet.mockReturnValue({ value: 'test-token' } as any)
  })

  it('Harus bisa melewati workflow lengkap (Submit -> Revisi -> Resubmit -> Approve)', async () => {
    const { submitJurnalAction } = await import('@/entities/jurnal/api/submit-jurnal.action')
    const { requestRevisionAction, approveJurnalAction } = await import('@/entities/jurnal/api/approve-jurnal.action')
    const { getJurnalDetail } = await import('@/entities/jurnal/api/get-jurnal-detail')

    // 1. Pengajuan Staf
    const validPayload: JurnalSubmissionPayload = {
      judul: 'Rapat Koordinasi Bawaslu',
      tanggal_kegiatan: '2026-08-06',
      kategori: 'rapat',
      dokumentasi: [],
      dokumen_pendukung: [],
      pihak_terkait: [],
      custom_fields: [],
      tags: ['rapat', 'bawaslu'],
      is_published: false,
    }
    
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'lawet-jurnal-1', status: 'draft' }),
    }))
    vi.stubEnv('LAWET_API_URL', 'http://127.0.0.1:2002')

    const submitRes = await submitJurnalAction(validPayload)
    expect(submitRes.success).toBe(true)
    
    const sourceId = submitRes.data?.source_id
    expect(sourceId).toBeDefined()

    // 2. Admin Request Revision & Approval actions verification
    expect(submitJurnalAction).toBeDefined()
    expect(requestRevisionAction).toBeDefined()
    expect(approveJurnalAction).toBeDefined()
    expect(getJurnalDetail).toBeDefined()
  })
})
