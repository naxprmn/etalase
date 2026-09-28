'use client'

import { useState, useEffect } from 'react'
import { submitJurnalAction } from '@/entities/jurnal/api/submit-jurnal.action'
import { JurnalSubmissionPayload } from '@/entities/jurnal/model/submission-schema'
import { getCategoryLabel } from '@/shared/ui/colors'
import { FileText, Calendar, Tag, Send, ArrowRight } from 'lucide-react'
import { FotoUploader } from './components/foto-uploader.client'
import { DokumenUploader } from './components/dokumen-uploader.client'
import { PihakTerkaitInput, CustomFieldsInput } from './components/dynamic-lists.client'

export function JurnalSubmitForm() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'Penanganan Pelanggaran',
    'Penyelesaian Sengketa',
    'mou',
    'koordinasi',
    'sosialisasi',
    'pembinaan',
    'pengawasan',
    'rapat',
    'lainnya'
  ])

  const [payload, setPayload] = useState<JurnalSubmissionPayload>({
    judul: '',
    ringkasan: '',
    tanggal_kegiatan: '',
    kategori: 'Penanganan Pelanggaran',
    dokumentasi: [],
    dokumen_pendukung: [],
    pihak_terkait: [],
    custom_fields: [],
    tags: [],
    link_publikasi: '',
    is_published: true
  })

  useEffect(() => {
    fetch('/api/jurnal/kategori')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.data) && data.data.length > 0) {
          setAvailableCategories(data.data)
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await submitJurnalAction(payload)
      if (res.success) {
        setSuccess(true)
        setPayload({ ...payload, judul: '',
    ringkasan: '', tags: [] })
      } else {
        setError(res.error || 'Gagal mengirim jurnal')
      }
    } catch (err: any) {
      setError(err.message || 'Koneksi terputus')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-surface p-6 md:p-8 rounded-2xl border border-[var(--glass-border-subtle)] shadow-xl relative overflow-hidden w-full max-w-3xl mx-auto">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-50" />
      
      <div className="mb-8">
        <h2 className="text-2xl font-black text-[var(--color-text-primary)] font-mono uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-6 h-6 text-[var(--color-accent-hover)]" />
          Pengajuan Jurnal
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">Isi formulir berikut untuk mengajukan draf jurnal kegiatan.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-2 border-red-500 text-red-700 text-sm font-mono rounded-r-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border-l-2 border-emerald-500 text-emerald-800 text-sm font-mono rounded-r-lg">
          Jurnal berhasil diajukan dan sedang menunggu proses approval.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Judul */}
        <div>
          <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 font-mono">Judul Jurnal *</label>
          <input
            type="text"
            required
            value={payload.judul}
            onChange={e => setPayload({ ...payload, judul: e.target.value })}
            className="w-full bg-[var(--color-surface-overlay)] border border-[var(--glass-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-[var(--color-accent)] transition-colors shadow-sm"
            placeholder="Contoh: Rapat Koordinasi Bawaslu"
          />
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tanggal */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-accent-hover)]" /> Tanggal Kegiatan *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={payload.tanggal_kegiatan}
                onChange={e => setPayload({ ...payload, tanggal_kegiatan: e.target.value })}
                className="w-full bg-[var(--color-surface-overlay)] border border-[var(--glass-border-default)] rounded-xl px-4 py-3 pr-11 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors shadow-sm"
              />
              <Calendar aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 font-mono">Kategori *</label>
            <select
              required
              value={payload.kategori}
              onChange={e => setPayload({ ...payload, kategori: e.target.value })}
              className="w-full bg-[var(--color-surface-overlay)] border border-[var(--glass-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors shadow-sm"
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>
        </div>

                    <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--color-accent-hover)]" /> Ringkasan Kegiatan *
            </label>
            <textarea
              required
              value={payload.ringkasan || ''}
              onChange={e => setPayload({ ...payload, ringkasan: e.target.value })}
              className="w-full bg-[var(--color-surface-overlay)] border border-[var(--glass-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-[var(--color-accent)] transition-colors shadow-sm min-h-[120px]"
              placeholder="Tuliskan ringkasan singkat mengenai kegiatan jurnal..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[var(--color-accent-hover)]" /> Tags (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={payload.tags.join(', ')}
              onChange={e => setPayload({ ...payload, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="w-full bg-[var(--color-surface-overlay)] border border-[var(--glass-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-[var(--color-accent)] transition-colors shadow-sm"
              placeholder="pemilu, pengawasan, bawaslu"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
              Link Publikasi Berita (Opsional)
            </label>
            <input
              type="url"
              value={payload.link_publikasi || ''}
              onChange={e => setPayload({ ...payload, link_publikasi: e.target.value })}
              className="w-full bg-[var(--color-surface-overlay)] border border-[var(--glass-border-default)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]/60 focus:outline-none focus:border-[var(--color-accent)] transition-colors shadow-sm"
              placeholder="https://bawaslu.go.id/..."
            />
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-[var(--glass-border-subtle)]">
          <FotoUploader 
            value={payload.dokumentasi} 
            onChange={(val) => setPayload({ ...payload, dokumentasi: val })} 
          />
          <DokumenUploader 
            value={payload.dokumen_pendukung} 
            onChange={(val) => setPayload({ ...payload, dokumen_pendukung: val })} 
          />
          <PihakTerkaitInput 
            value={payload.pihak_terkait} 
            onChange={(val) => setPayload({ ...payload, pihak_terkait: val })} 
          />
          <CustomFieldsInput 
            value={payload.custom_fields} 
            onChange={(val) => setPayload({ ...payload, custom_fields: val })} 
          />
        </div>

        <div className="pt-6 border-t border-[var(--glass-border-subtle)]">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-accent)] text-[var(--color-text-on-accent)] font-bold py-3.5 px-4 rounded-xl hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono text-sm uppercase tracking-wider disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" /> Ajukan Jurnal <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
