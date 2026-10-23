import { describe, it, expect } from 'vitest'
import { determineJurnalVisibility, isJurnalExplicitlyPrivate } from '@/entities/jurnal/lib/visibility'

describe('determineJurnalVisibility', () => {
  it('respects explicit boolean is_published', () => {
    expect(determineJurnalVisibility({ is_published: false })).toBe(false)
    expect(determineJurnalVisibility({ is_published: true })).toBe(true)
  })

  it('determines private visibility from custom_fields akses / is_published', () => {
    expect(
      determineJurnalVisibility({
        custom_fields: [{ label: 'akses', value: 'privat' }],
      })
    ).toBe(false)

    expect(
      determineJurnalVisibility({
        custom_fields: [{ label: 'Akses', value: 'Privat' }],
      })
    ).toBe(false)

    expect(
      determineJurnalVisibility({
        custom_fields: [{ label: 'is_published', value: 'false' }],
      })
    ).toBe(false)

    expect(
      determineJurnalVisibility({
        custom_fields: [{ label: 'akses', value: 'publik' }],
      })
    ).toBe(true)
  })

  it('keeps journal public when is_published is true even if all docs are internal (ADR-0007)', () => {
    expect(
      determineJurnalVisibility({
        is_published: true,
        dokumen_pendukung: [
          { nama: 'internal_sk.pdf', url: 'http://example.com/sk.pdf', tipe: 'pdf', is_public: false },
        ],
      })
    ).toBe(true)
  })

  it('determines private only if journal is unspecified and docs indicate private', () => {
    expect(
      determineJurnalVisibility({
        dokumen_pendukung: [
          { nama: 'doc1.pdf', url: 'http://example.com/1.pdf', tipe: 'pdf', is_public: false },
          { nama: 'doc2.pdf', url: 'http://example.com/2.pdf', tipe: 'pdf', is_public: false },
        ],
      })
    ).toBe(false)
  })

  it('sets public visibility when at least one supporting document is public', () => {
    expect(
      determineJurnalVisibility({
        dokumen_pendukung: [
          { nama: 'doc1.pdf', url: 'http://example.com/1.pdf', tipe: 'pdf', is_public: false },
          { nama: 'doc2.pdf', url: 'http://example.com/2.pdf', tipe: 'pdf', is_public: true },
        ],
      })
    ).toBe(true)
  })

  it('preserves existing private state when no docs or custom fields are provided', () => {
    expect(
      determineJurnalVisibility({
        dokumen_pendukung: [],
        custom_fields: [],
        existing_is_published: false,
      })
    ).toBe(false)
  })

  it('defaults to true for brand new journal without explicit private indicators', () => {
    expect(
      determineJurnalVisibility({
        dokumen_pendukung: [],
        custom_fields: [],
      })
    ).toBe(true)
  })
})

describe('isJurnalExplicitlyPrivate', () => {
  it('identifies private journal by boolean is_published', () => {
    expect(isJurnalExplicitlyPrivate({ is_published: false })).toBe(true)
  })

  it('identifies private journal by custom_fields', () => {
    expect(
      isJurnalExplicitlyPrivate({
        is_published: true,
        custom_fields: [{ label: 'Akses', value: 'privat' }],
      })
    ).toBe(true)
  })

  it('does NOT mark journal private when is_published is true even if docs are internal (ADR-0007)', () => {
    expect(
      isJurnalExplicitlyPrivate({
        is_published: true,
        dokumen_pendukung: [{ nama: 'secret.pdf', url: 'http://secret.pdf', is_public: false }],
      })
    ).toBe(false)
  })

  it('identifies private journal when explicitly marked or docs indicate private on unset is_published', () => {
    expect(
      isJurnalExplicitlyPrivate({
        dokumen_pendukung: [{ nama: 'secret.pdf', url: 'http://secret.pdf', is_public: false }],
      })
    ).toBe(true)
  })

  it('returns false for public journal with public docs', () => {
    expect(
      isJurnalExplicitlyPrivate({
        is_published: true,
        dokumen_pendukung: [{ nama: 'public.pdf', url: 'http://public.pdf', is_public: true }],
      })
    ).toBe(false)
  })
})
