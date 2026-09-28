import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetMeAction = vi.fn()
vi.mock('@/entities/lawet-user', () => ({
  getMeAction: () => mockGetMeAction(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockSelect = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/shared/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelect(),
        }),
      }),
    }),
    delete: () => ({
      where: () => mockDelete(),
    }),
  },
}))

describe('deleteJurnalAction authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated caller', async () => {
    mockGetMeAction.mockResolvedValue(null)
    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')

    const res = await deleteJurnalAction('journal-1')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/unauthorized/i)
  })

  it('rejects unauthorized caller who is neither owner nor approver', async () => {
    mockGetMeAction.mockResolvedValue({
      id: 'user-staff-1',
      name: 'Agus',
      role: { name: 'Staff', can_approve: false, is_superadmin: false },
    })
    mockSelect.mockResolvedValue([{ id: 'journal-1', redaksi: 'Budi' }])

    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')
    const res = await deleteJurnalAction('journal-1')

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/akses ditolak/i)
  })

  it('allows owner to delete their own journal', async () => {
    mockGetMeAction.mockResolvedValue({
      id: 'user-staff-1',
      name: 'Agus',
      role: { name: 'Staff', can_approve: false, is_superadmin: false },
    })
    mockSelect.mockResolvedValue([{ id: 'journal-1', redaksi: 'Agus' }])
    mockDelete.mockResolvedValue([])

    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')
    const res = await deleteJurnalAction('journal-1')

    expect(res.success).toBe(true)
  })

  it('allows privileged approver/kasubag to delete journal', async () => {
    mockGetMeAction.mockResolvedValue({
      id: 'user-kasubag',
      name: 'Candra',
      role: { name: 'Kasubag', can_approve: true, is_superadmin: false },
    })
    mockSelect.mockResolvedValue([{ id: 'journal-1', redaksi: 'Agus' }])
    mockDelete.mockResolvedValue([])

    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')
    const res = await deleteJurnalAction('journal-1')

    expect(res.success).toBe(true)
  })
})
