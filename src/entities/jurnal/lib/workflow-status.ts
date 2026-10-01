/**
 * Arti status workflow Lawet Hub (ADR-0005) untuk ditampilkan di panel:
 * - draft             → sudah diajukan, menunggu review approver
 * - rejected          → dikembalikan approver untuk diperbaiki
 * - publish_pending   → sudah disetujui, sedang dikirim ke ALAS
 * - published         → terbit di etalase publik
 */
export type WorkflowStatus =
  | 'draft'
  | 'rejected'
  | 'publish_pending'
  | 'published'
  | 'unpublish_pending'
  | 'deleted'

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  draft: 'Menunggu Review',
  rejected: 'Dikembalikan',
  publish_pending: 'Sedang Diterbitkan',
  published: 'Terbit',
  unpublish_pending: 'Sedang Ditarik',
  deleted: 'Dihapus',
}

export function workflowStatusLabel(status: string | undefined): string {
  return WORKFLOW_STATUS_LABEL[status as WorkflowStatus] ?? 'Menunggu Review'
}

/** Jurnal yang belum terbit: masih di antrean, dikembalikan, atau sedang dikirim. */
export function isInProcess(status: string | undefined): boolean {
  return status === 'draft' || status === 'rejected' || status === 'publish_pending'
}

interface ActorLike {
  name?: string
  role?: { is_superadmin?: boolean } | null
}

interface JurnalLike {
  status?: string
  owner_id?: string
  owner_name?: string
}

/**
 * Lawet Hub hanya mengizinkan edit/hapus oleh pemilik atau superadmin, dan
 * pemilik tidak bisa mengedit jurnal yang sudah terbit.
 */
export function canEditJurnal(user: ActorLike | null | undefined, item: JurnalLike, userId?: string): boolean {
  if (!user) return false
  if (user.role?.is_superadmin) return true
  return isOwner(user, item, userId) && item.status !== 'published' && item.status !== 'publish_pending'
}

export function canDeleteJurnal(user: ActorLike | null | undefined, item: JurnalLike, userId?: string): boolean {
  if (!user) return false
  return Boolean(user.role?.is_superadmin) || isOwner(user, item, userId)
}

function isOwner(user: ActorLike, item: JurnalLike, userId?: string): boolean {
  if (item.owner_id && userId) return item.owner_id === userId
  const a = (user.name || '').trim().toLocaleLowerCase('id-ID')
  const b = (item.owner_name || '').trim().toLocaleLowerCase('id-ID')
  return Boolean(a) && a === b
}
