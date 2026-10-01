import { pgTable, uuid, text, date, varchar, jsonb, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const jurnal = pgTable('jurnal', {
  id:               uuid('id').primaryKey().defaultRandom(),
  source_id:        uuid('source_id').notNull().unique(),
  judul:            text('judul').notNull(),
    ringkasan:        text('ringkasan'),
  tanggal_kegiatan: date('tanggal_kegiatan').notNull(),
  kategori:         varchar('kategori', { length: 50 }).notNull(),
  link_publikasi:   text('link_publikasi'),
  dokumentasi:      jsonb('dokumentasi').default([]),
  dokumen_pendukung:jsonb('dokumen_pendukung').default([]),
  pihak_terkait:    jsonb('pihak_terkait').default([]),
  custom_fields:    jsonb('custom_fields').default([]),
  tags:             jsonb('tags').default([]),
  redaksi:          text('redaksi'),
  divisi:           text('divisi'),
  is_published:     boolean('is_published').notNull().default(true),
  workflow_status:  varchar('workflow_status', { length: 50 }).notNull().default('draft'),
  workflow_notes:   text('workflow_notes'),
  version:          integer('version').notNull().default(1),
  synced_at:        timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('jurnal_public_tanggal_id_idx')
    .on(table.tanggal_kegiatan.desc(), table.id.desc())
    .where(sql`${table.is_published} = true`),
  index('jurnal_public_kategori_tanggal_id_idx')
    .on(table.kategori, table.tanggal_kegiatan.desc(), table.id.desc())
    .where(sql`${table.is_published} = true`),
])

export const pimpinan = pgTable('pimpinan', {
  id:              uuid('id').primaryKey().defaultRandom(),
  source_id:       uuid('source_id').notNull().unique(),
  nama:            text('nama').notNull(),
  jabatan:         text('jabatan').notNull(),
  foto_url:        text('foto_url'),
  bio:             text('bio'),
  periode_mulai:   date('periode_mulai').notNull(),
  periode_selesai: date('periode_selesai'),
  urutan:          integer('urutan').notNull().default(0),
  is_active:       boolean('is_active').notNull().default(true),
  created_at:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Ledger untuk memastikan satu delivery Direct Service hanya diproses sekali. */
export const serviceEvents = pgTable('service_events', {
  event_id:        uuid('event_id').primaryKey(),
  resource_type:   varchar('resource_type', { length: 30 }).notNull(),
  source_id:       uuid('source_id').notNull(),
  operation:       varchar('operation', { length: 30 }).notNull(),
  processed_at:    timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('service_events_source_idx').on(table.resource_type, table.source_id),
])
