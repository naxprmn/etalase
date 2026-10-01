import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JurnalSubmissionPayload } from '@/entities/jurnal/model/submission-schema'
import { db } from '@/shared/lib/db'

// Mock cookies
const cookieGet = vi.hoisted(() => vi.fn(() => ({ value: 'dummy-staff-token' })))
vi.mock('next/headers', () => ({
  cookies: () => ({ get: cookieGet }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Lawet User
vi.mock('@/entities/lawet-user', () => ({
  getMeAction: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Staf Test',
    username: 'staftest',
    role: { name: 'staf', can_approve: false },
    division: { name: 'Divisi Hukum' }
  })
}))

// Mock DB
vi.mock('@/shared/lib/db', () => {
  const insertMock = vi.fn(() => ({
    values: vi.fn().mockResolvedValue([{ source_id: 'mocked-uuid' }])
  }))
  const updateMock = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 1, source_id: 'mocked-uuid', workflow_status: 'approved' }])
      }))
    }))
  }))
  const selectMock = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([{ id: 1, source_id: 'mocked-uuid', workflow_status: 'submitted' }])
    }))
  }))
  
  return {
    db: {
      insert: insertMock,
      update: updateMock,
      select: selectMock
    }
  }
})

// Mock crypto
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234'
})

describe('ALAS Local Write Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cookieGet.mockReturnValue({ value: 'test-token' } as any)
  })

  it('Skenario 1: Submit Jurnal validates input and posts directly to Lawet Hub (ADR-0005)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'lawet-jurnal-1', status: 'draft' }),
    })
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubEnv('LAWET_API_URL', 'http://127.0.0.1:2002')
    const { submitJurnalAction } = await import('@/entities/jurnal/api/submit-jurnal.action')
    
    // Invalid Payload (Judul too short)
    const invalidPayload: JurnalSubmissionPayload = {
      judul: 'A',
      tanggal_kegiatan: '2026-08-06',
      kategori: 'sosialisasi',
      dokumentasi: [],
      dokumen_pendukung: [],
      pihak_terkait: [],
      custom_fields: [],
      tags: [],
      is_published: false,
    }
    const invalidRes = await submitJurnalAction(invalidPayload)
    expect(invalidRes.success).toBe(false)
    expect(invalidRes.error).toMatch(/minimal 3 karakter/i)

    // Valid Payload
    const validPayload: JurnalSubmissionPayload = {
      ...invalidPayload,
      judul: 'Rapat Bawaslu Valid',
      dokumentasi: [{ url: '/api/v1/jurnal-alas/media/jurnal-foto/a.png', type: 'image' }],
      dokumen_pendukung: [{ nama: 'Notulen', url: '/api/v1/jurnal-alas/media/jurnal-dokumen/b.pdf', tipe: 'pdf', is_public: false }],
    }
    expect(fetchSpy).not.toHaveBeenCalled()

    const result = await submitJurnalAction(validPayload)
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ source_id: 'lawet-jurnal-1', status: 'draft' })

    // Staf: hanya create (tanpa auto-approve), tidak menulis ke DB lokal
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:2002/api/v1/jurnal-alas/')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    // URL proxy media dikirim sebagai object_name sesuai kontrak Lawet Hub
    expect(body.dokumentasi[0].url).toBe('jurnal-foto/a.png')
    expect(body.dokumen_pendukung[0].url).toBe('jurnal-dokumen/b.pdf')
    expect(db.insert).not.toHaveBeenCalled()
  })

  it('Skenario 2 & 5: Approval Queue and Approve Action (Lawet Hub Centralized)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', judul: 'Rapat Koordinasi Bawaslu' }],
    })
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubEnv('LAWET_API_URL', 'http://127.0.0.1:2002')

    const { approveJurnalAction, getApprovalQueueAction } = await import('@/entities/jurnal/api/approve-jurnal.action')
    
    // Fetch Queue dari Lawet Hub
    const queueRes = await getApprovalQueueAction()
    expect(queueRes.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:2002/api/v1/jurnal-alas/approval-queue',
      expect.any(Object)
    )

    // Approve Action ke Lawet Hub
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok' }),
    })
    const approveRes = await approveJurnalAction('1')
    expect(approveRes.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:2002/api/v1/jurnal-alas/1/approve',
      expect.any(Object)
    )
  })
})
