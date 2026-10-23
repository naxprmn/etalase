import { NextResponse, NextRequest } from 'next/server'
import { getJurnalDetail } from '@/entities/jurnal/api/get-jurnal-detail'
import { canViewRestrictedJurnal } from '@/entities/jurnal/api/can-view-restricted-jurnal'
import { isJurnalExplicitlyPrivate } from '@/entities/jurnal/lib/visibility'
import { hasPrivateDokumen, publicDokumen, withoutVisibilityFlag } from '@/entities/jurnal/lib/dokumen-access'
import { getMeAction } from '@/entities/lawet-user'
import { internalErrorResponse } from '@/shared/lib/api-error'

const notFound = () => NextResponse.json({ status: "error", message: "not found" }, { status: 404 })

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getMeAction()
    const item = await getJurnalDetail(params.id, false)
    if (!item) return notFound()

    // Jurnal yang belum/tidak publik hanya untuk yang berwenang atasnya (bukan sekadar bernama sama dengan redaksi).
    const notPublic = !item.is_published || item.workflow_status !== 'published' || isJurnalExplicitlyPrivate(item)
    let restrictedAccess = false
    if (notPublic) {
      restrictedAccess = Boolean(user) && await canViewRestrictedJurnal(user, item)
      if (!restrictedAccess) return notFound()
    }

    const docs = Array.isArray(item.dokumen_pendukung) ? item.dokumen_pendukung : []

    // ADR-0007: pengunjung anonim tidak menerima dokumen pendukung sama sekali. Pengguna login hanya
    // melihat dokumen publik, kecuali yang berwenang atas jurnal ini (superadmin, approver divisinya, pemilik).
    if (user && !restrictedAccess && hasPrivateDokumen(docs)) {
      restrictedAccess = await canViewRestrictedJurnal(user, item)
    }
    const visibleDocs = !user ? [] : restrictedAccess ? docs : publicDokumen(docs)

    const transformedItem = {
      id: item.id,
      source_id: item.source_id,
      judul: item.judul,
      ringkasan: item.ringkasan,
      tanggal_kegiatan: item.tanggal_kegiatan,
      kategori: item.kategori,
      link_publikasi: item.link_publikasi,
      pihak_terkait: item.pihak_terkait,
      dokumentasi: item.dokumentasi,
      dokumen_pendukung: withoutVisibilityFlag(visibleDocs as any[]),
      custom_fields: item.custom_fields,
      tags: item.tags,
      redaksi: item.redaksi,
      created_at: item.created_at,
    }

    return NextResponse.json({ status: "ok", data: transformedItem })
  } catch (error) {
    return internalErrorResponse('GET /api/jurnal/[id]', error)
  }
}

export const dynamic = 'force-dynamic'
