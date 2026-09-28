import { NextResponse, NextRequest } from 'next/server'
import { getJurnalList } from '@/entities/jurnal/api/get-jurnal-list'

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

    const transformedItems = pageItems.map(item => {
      const docs = Array.isArray(item.dokumen_pendukung) ? item.dokumen_pendukung : []
      const publicDocs = docs.filter((d: any) => d && d.is_public === true)
      
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
        dokumen_pendukung: publicDocs.map(({ is_public, ...rest }: any) => rest),
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
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    )
  }
}
export const dynamic = 'force-dynamic'
