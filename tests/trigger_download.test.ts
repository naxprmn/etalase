import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerDownload } from '@/entities/jurnal/lib/download'

describe('triggerDownload lib helper', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers download via Blob object URL when fetch succeeds', async () => {
    const mockBlob = new Blob(['sample content'], { type: 'application/pdf' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => mockBlob,
    })
    globalThis.fetch = fetchMock

    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/1234')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const result = await triggerDownload('https://example.com/file.pdf', 'surat_tugas.pdf')

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/file.pdf', { mode: 'cors' })
    expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob)
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/1234')
  })

  it('falls back to direct anchor download on fetch failure / CORS rejection', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('CORS blocked'))
    globalThis.fetch = fetchMock

    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    const result = await triggerDownload('https://cdn.other.com/photo.jpg', 'kegiatan.jpg')

    expect(result).toBe(false)
    expect(appendChildSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
  })
})
