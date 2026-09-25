import { Suspense } from 'react'
import LandingView from '@/views/landing'
import { getMeAction } from '@/entities/lawet-user'
import { db } from '@/shared/lib/db'
import { jurnal } from '../../drizzle/schema'
import { eq, desc } from 'drizzle-orm'

export default async function Home() {
  const user = await getMeAction()
  
  const hero = {
    imagePath: '/assets/banner-image.jpg',
    title: 'ETALASE',
    subtitle: 'Arsip Jurnal Bawaslu Kebumen'
  }

  const publishedJurnals = await db.select().from(jurnal).where(eq(jurnal.workflow_status, 'published')).orderBy(desc(jurnal.created_at)).limit(10);
  
  const recentPhotos = [];
  for (const j of publishedJurnals) {
    if (j.dokumentasi && Array.isArray(j.dokumentasi)) {
      for (const d of j.dokumentasi) {
        if (d.url && (d.url.startsWith('http') || d.url.startsWith('/') || d.url.startsWith('data:'))) {
          recentPhotos.push({
            url: d.url,
            judul: j.judul,
            kategori: j.kategori
          });
          if (recentPhotos.length >= 6) break;
        }
      }
    }
    if (recentPhotos.length >= 6) break;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center font-mono">Memuat beranda...</div>}>
      <LandingView heroImagePath={hero.imagePath} heroTitle={hero.title} heroSubtitle={hero.subtitle} user={user} recentPhotos={recentPhotos} />
    </Suspense>
  )
}
