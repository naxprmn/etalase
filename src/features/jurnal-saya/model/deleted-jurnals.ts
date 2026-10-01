'use client'

import { useSyncExternalStore } from 'react'
import type { JurnalWorkspace } from '../api/get-my-jurnals.action'

/**
 * Lawet Hub menghapus jurnal terbit secara asinkron: DELETE ke ALAS diantrekan
 * lewat outbox, sedangkan daftar "terbit" dibaca dari read model ALAS. Tepat
 * setelah hapus, `router.refresh()` masih bisa menerima baris lama. Store ini
 * menyembunyikan jurnal yang sudah dihapus di sesi ini sampai read model
 * menyusul.
 */
const EMPTY: ReadonlySet<string> = new Set()
let deletedIds: ReadonlySet<string> = EMPTY
const listeners = new Set<() => void>()

export function markJurnalDeleted(id: string) {
  if (deletedIds.has(id)) return
  const next = new Set(deletedIds)
  next.add(id)
  deletedIds = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useDeletedJurnalIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, () => deletedIds, () => EMPTY)
}

export function withoutDeletedJurnals<T extends JurnalWorkspace | null>(workspace: T, ids: ReadonlySet<string>): T {
  if (!workspace || ids.size === 0) return workspace
  return {
    ...workspace,
    mine: workspace.mine.filter((item) => !ids.has(item.id)),
    subordinates: workspace.subordinates.filter((item) => !ids.has(item.id)),
  }
}
