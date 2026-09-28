'use client'

import { useState, useRef } from 'react'
import { DokumenPendukungItem } from '@/entities/jurnal/model/submission-schema'
import { uploadDokumenAction } from '@/entities/jurnal/api/upload-media.action'

interface Props {
  value: DokumenPendukungItem[]
  onChange: (value: DokumenPendukungItem[]) => void
}

export function DokumenUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    const namaDokumen = prompt('Masukkan nama dokumen (mis. Surat Tugas, Notulen):', file.name)
    
    if (!namaDokumen) {
       e.target.value = ''
       return
    }

    setUploading(true)
    setError(null)
    
    // Reset input
    e.target.value = ''

    const formData = new FormData()
    formData.append('file', file)
    formData.append('nama', namaDokumen)

    const res = await uploadDokumenAction(formData)
    if (res.success && res.data?.url) {
      onChange([...value, { nama: namaDokumen, url: res.data.url, tipe: 'pdf', is_public: false }])
    } else {
      setError(res.error || 'Gagal mengunggah dokumen')
    }
    
    setUploading(false)
  }

  const removeDokumen = (index: number) => {
    const newVal = value.filter((_, i) => i !== index)
    onChange(newVal)
  }

  const togglePublic = (index: number) => {
    const newVal = value.map((item, i) => {
      if (i === index) {
        return { ...item, is_public: !item.is_public }
      }
      return item
    })
    onChange(newVal)
  }

  return (
    <div className="space-y-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] tracking-widest uppercase">
          📄 Dokumen Pendukung (PDF)
        </label>
        <div>
          <label className={`cursor-pointer px-4 py-2 text-sm rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading ? 'Mengunggah...' : '+ Tambah Dokumen'}
            <input type="file" className="hidden" accept="application/pdf" onChange={handleFileSelect} disabled={uploading} ref={fileInputRef} />
          </label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {value.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {value.map((item, index) => (
            <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-xl">📑</span>
                <div className="truncate">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{item.nama}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">PDF Document</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.is_public === true}
                    onChange={() => togglePublic(index)}
                    className="w-4 h-4 rounded border-[var(--color-border-subtle)] text-[var(--color-accent-hover)] focus:ring-[var(--color-accent)] cursor-pointer"
                  />
                  <span>(public)</span>
                </label>
                <button
                  type="button"
                  onClick={() => removeDokumen(index)}
                  className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
