import { getJurnalWorkspaceAction } from '@/features/jurnal-saya/api/get-my-jurnals.action'
import { getMeAction } from '@/entities/lawet-user'
import PanelLayoutClient from '@/views/panel/ui/panel-layout.client'

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PanelPage({ searchParams }: { searchParams: { tab?: string, editId?: string } }) {
  const user = await getMeAction();
  
  if (!user) {
    redirect('/')
  }

  const isKasubag = user?.role?.name?.toLowerCase().includes('kasubag') || user?.role?.can_approve;
  const defaultTab = isKasubag ? 'kelola' : 'tambah';
  const activeMenu = searchParams.tab || defaultTab;
  
  let workspace = null;
  let error = null;

  if (activeMenu === 'jurnal' || activeMenu === 'kelola' || activeMenu === 'approval' || activeMenu === 'edit') {
    try {
      workspace = await getJurnalWorkspaceAction()
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'Gagal memuat data jurnal'
    }
  }

  const editId = searchParams.editId || null;

  return <PanelLayoutClient activeMenu={activeMenu} workspace={workspace} error={error} user={user} editId={editId} />
}
