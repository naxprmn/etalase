import { NextResponse, NextRequest } from 'next/server'
import { getJurnalList } from '@/entities/jurnal/api/get-jurnal-list'
import { getMeAction } from '@/entities/lawet-user'
import { publicDokumen, withoutVisibilityFlag } from '@/entities/jurnal/lib/dokumen-access'
import { internalErrorResponse } from '@/shared/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const kategori = searchParams.get('kategori') || ''
    const date = searchParams.get('date') || ''
    const tahun = searchParams.get('tahun') || ''
    const cursor = searchParams.get('cursor') || ''
    const summaryOnly = searchParams.get('view') === 'summary'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50)

    const { items: rawItems, totalCount } = await getJurnalList({ q, kategori, cursor, limit, date, tahun })

    const totalPages = Math.ceil(totalCount / limit)
    const pageItems = rawItems

    // ADR-0007: pengunjung anonim tidak menerima dokumen pendukung; pengguna login hanya yang publik.
    const viewer = summaryOnly ? null : await getMeAction()

    const transformedItems = pageItems.map(item => {
      const docPhotos = Array.isArray(item.dokumentasi) ? item.dokumentasi : []
      const firstPhoto = docPhotos.find((d: any) => d && d.type === 'image')
      const thumbnailUrl = firstPhoto ? firstPhoto.url : null

      const summary = {
        id: item.id,
        judul: item.judul,
        ringkasan: item.ringkasan,
        tanggal_kegiatan: item.tanggal_kegiatan,
        kategori: item.kategori,
        thumbnail_url: thumbnailUrl,
        pihak_terkait: item.pihak_terkait,
        tags: item.tags,
      }

      if (summaryOnly) return summary

      return {
        ...summary,
        source_id: item.source_id,
        link_publikasi: item.link_publikasi,
        dokumentasi: item.dokumentasi,
        dokumen_pendukung: viewer ? withoutVisibilityFlag(publicDokumen(item.dokumen_pendukung)) : [],
        custom_fields: item.custom_fields,
        redaksi: item.redaksi,
        created_at: item.created_at,
      }
    })

    return NextResponse.json({
      status: "ok",
      data: transformedItems,
      pagination: {
        total_count: totalCount,
        total_pages: totalPages,
        current_page: Number(cursor) || 1
      }
    })
  } catch (error) {
    return internalErrorResponse('GET /api/jurnal', error)
  }
}
export const dynamic = 'force-dynamic'
