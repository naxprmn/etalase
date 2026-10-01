import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const jsonObject = z.record(z.string(), z.unknown())

export const dokumenSchema = z.object({
  nama: z.string().min(1).max(500),
  url: z.string().min(1).max(2048),
  tipe: z.string().min(1).max(100),
  is_public: z.boolean().optional(),
}).strict()

export const jurnalPayloadSchema = z.object({
  source_id: z.string().uuid(),
  judul: z.string().min(1).max(1000),
  ringkasan: z.string().max(2000).nullable().optional(),
  tanggal_kegiatan: isoDate,
  kategori: z.string().min(1).max(50),
  link_publikasi: z.string().max(2048).nullable().optional(),
  dokumentasi: z.array(jsonObject).max(200).optional(),
  dokumen_pendukung: z.array(dokumenSchema).max(200).optional(),
  pihak_terkait: z.array(jsonObject).max(200).optional(),
  custom_fields: z.array(jsonObject).max(200).optional(),
  tags: z.array(z.string().max(100)).max(100).nullable().optional(),
  redaksi: z.string().max(500).nullable().optional(),
  divisi: z.string().max(200).nullable().optional(),
}).strict()

export const jurnalPatchSchema = jurnalPayloadSchema
  .omit({ source_id: true })
  .partial()
  .extend({ is_published: z.boolean().optional() })

export const dokumenPatchSchema = z.object({
  dokumen_pendukung: z.array(dokumenSchema).max(200),
}).strict()

export const pimpinanPayloadSchema = z.object({
  source_id: z.string().uuid(),
  nama: z.string().min(1).max(500),
  jabatan: z.string().min(1).max(500),
  foto_url: z.string().max(2048).nullable().optional(),
  bio: z.string().max(10_000).nullable().optional(),
  periode_mulai: isoDate,
  periode_selesai: isoDate.nullable().optional(),
  urutan: z.number().int().min(0).max(10_000).optional(),
}).strict()

export const pimpinanPatchSchema = pimpinanPayloadSchema
  .omit({ source_id: true })
  .partial()
  .extend({ is_active: z.boolean().optional() })
