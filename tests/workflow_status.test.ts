import { describe, expect, it } from 'vitest'
import {
  canDeleteJurnal,
  canEditJurnal,
  isInProcess,
  workflowStatusLabel,
} from '@/entities/jurnal/lib/workflow-status'

const staff = { name: 'Staf Uji', role: { is_superadmin: false } }
const superadmin = { name: 'Superadmin', role: { is_superadmin: true } }

describe('workflow status labels (Lawet Hub semantics)', () => {
  it('maps Lawet statuses to the narrative shown in the panel', () => {
    expect(workflowStatusLabel('draft')).toBe('Menunggu Review')
    expect(workflowStatusLabel('rejected')).toBe('Dikembalikan')
    expect(workflowStatusLabel('publish_pending')).toBe('Sedang Diterbitkan')
    expect(workflowStatusLabel('published')).toBe('Terbit')
  })

  it('treats everything not yet published as in process', () => {
    expect(['draft', 'rejected', 'publish_pending'].every(isInProcess)).toBe(true)
    expect(isInProcess('published')).toBe(false)
  })
})

describe('edit/delete permissions mirror Lawet Hub rules', () => {
  it('lets the owner edit a jurnal that is not yet published', () => {
    expect(canEditJurnal(staff, { status: 'draft', owner_id: 'u1' }, 'u1')).toBe(true)
    expect(canEditJurnal(staff, { status: 'rejected', owner_name: 'staf uji' })).toBe(true)
  })

  it('blocks owners from editing published jurnal and others from editing at all', () => {
    expect(canEditJurnal(staff, { status: 'published', owner_id: 'u1' }, 'u1')).toBe(false)
    expect(canEditJurnal(staff, { status: 'draft', owner_id: 'u2' }, 'u1')).toBe(false)
  })

  it('lets superadmin edit and delete anything', () => {
    expect(canEditJurnal(superadmin, { status: 'published', owner_id: 'u2' }, 'u1')).toBe(true)
    expect(canDeleteJurnal(superadmin, { status: 'published', owner_id: 'u2' }, 'u1')).toBe(true)
  })

  it('lets only the owner delete as non-superadmin', () => {
    expect(canDeleteJurnal(staff, { owner_id: 'u1' }, 'u1')).toBe(true)
    expect(canDeleteJurnal(staff, { owner_id: 'u2' }, 'u1')).toBe(false)
    expect(canDeleteJurnal(null, { owner_id: 'u1' }, 'u1')).toBe(false)
  })
})
