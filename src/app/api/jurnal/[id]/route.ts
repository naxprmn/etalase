import { NextResponse, NextRequest } from 'next/server'

import { getJurnalDetail } from '@/entities/jurnal/api/get-jurnal-detail'

import { getMeAction } from '@/entities/lawet-user'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {

  try {

    const user = await getMeAction()

    const id = params.id

    const item = await getJurnalDetail(id, false)
    
    if (item && item.workflow_status !== 'published') {
      if (!user) {
        return NextResponse.json({ status: "error", message: "not found" }, { status: 404 })
      }
      // Strict check: Only Kasubag or the owner can view
      const isOwner = user.name === item.redaksi;
      const isKasubag = user.role?.name?.toLowerCase().includes('kasubag') || user.role?.can_approve;
      if (!isOwner && !isKasubag) {
        return NextResponse.json({ status: "error", message: "not found" }, { status: 404 })
      }
    }

    if (!item) {

      return NextResponse.json(

        { status: "error", message: "not found" },

        { status: 404 }

      )

    }



    const docs = Array.isArray(item.dokumen_pendukung) ? item.dokumen_pendukung : []

    const publicDocs = docs;



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

      dokumen_pendukung: publicDocs.map(({ is_public, ...rest }: any) => rest),

      custom_fields: item.custom_fields,

      tags: item.tags,

      redaksi: item.redaksi,

      created_at: item.created_at,

    }



    return NextResponse.json({

      status: "ok",

      data: transformedItem

    })

  } catch (error: any) {

    return NextResponse.json(

      { status: "error", message: error.message },

      { status: 500 }

    )

  }

}

export const dynamic = 'force-dynamic'





