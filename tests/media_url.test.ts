import { describe, expect, it } from 'vitest'
import {
  JURNAL_MEDIA_PREFIX,
  toMediaDisplayUrl,
  toMediaObjectName,
} from '@/entities/jurnal/lib/media-url'

describe('media-url utilities for Lawet Hub media proxy', () => {
  it('converts MinIO object names to proxy URLs', () => {
    expect(toMediaDisplayUrl('jurnal-foto/foto123.jpg')).toBe(
      `${JURNAL_MEDIA_PREFIX}jurnal-foto/foto123.jpg`
    )
    expect(toMediaDisplayUrl('jurnal-dokumen/doc123.pdf')).toBe(
      `${JURNAL_MEDIA_PREFIX}jurnal-dokumen/doc123.pdf`
    )
  })

  it('keeps already formatted proxy URLs or absolute URLs unchanged', () => {
    const proxyUrl = '/api/v1/jurnal-alas/media/jurnal-foto/foto123.jpg'
    expect(toMediaDisplayUrl(proxyUrl)).toBe(proxyUrl)

    const httpUrl = 'https://minio.bawaslu.go.id/bucket/photo.jpg'
    expect(toMediaDisplayUrl(httpUrl)).toBe(httpUrl)

    const blobUrl = 'blob:http://localhost:3000/12345'
    expect(toMediaDisplayUrl(blobUrl)).toBe(blobUrl)

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    expect(toMediaDisplayUrl(dataUrl)).toBe(dataUrl)
  })

  it('strips media proxy prefix back to object_name for saving', () => {
    expect(
      toMediaObjectName('/api/v1/jurnal-alas/media/jurnal-foto/foto123.jpg')
    ).toBe('jurnal-foto/foto123.jpg')
    expect(toMediaObjectName('jurnal-foto/foto123.jpg')).toBe('jurnal-foto/foto123.jpg')
  })
})
