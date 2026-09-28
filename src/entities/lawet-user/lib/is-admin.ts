import type { LawetUser } from '../model/lawet-user'

const DEFAULT_ADMIN_ROLE_LEVEL = 3

function normalizedRoleName(name: string | undefined): string {
  return (name || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
}

export function getAdminRoleLevel(): number {
  const configuredLevel = Number.parseInt(
    process.env.ALAS_ADMIN_ROLE_LEVEL || String(DEFAULT_ADMIN_ROLE_LEVEL),
    10,
  )

  return Number.isSafeInteger(configuredLevel) && configuredLevel > 0
    ? configuredLevel
    : DEFAULT_ADMIN_ROLE_LEVEL
}

/**
 * Lawet Hub adalah sumber otorisasi. Superadmin tetap dikenali walau API lama
 * tidak mengirim `role.level`; role level dipakai untuk konfigurasi instalasi lain.
 */
export function isAdminUser(user: Pick<LawetUser, 'role'> | null | undefined, minimumLevel = getAdminRoleLevel()): boolean {
  if (!user) return false

  return user.role?.is_superadmin === true
    || normalizedRoleName(user.role?.name) === 'superadmin'
    || (Number.isSafeInteger(user.role?.level) && user.role.level >= minimumLevel)
}

/**
 * Capability eksplisit dari Lawet Hub adalah sumber utama. Pemeriksaan level
 * dipertahankan untuk kompatibilitas response Lawet lama yang belum mengirim
 * `can_approve`.
 */
export function canApproveJurnal(user: Pick<LawetUser, 'role'> | null | undefined): boolean {
  if (!user) return false

  return isAdminUser(user)
    || user.role?.can_approve === true
    || (Number.isSafeInteger(user.role?.level) && user.role.level >= 2)
}

/**
 * Memeriksa apakah user memiliki hak akses ke sistem ALAS.
 * Sesuai kontrak Lawet Hub:
 * - Superadmin selalu memiliki akses.
 * - has_alas_access bernilai true.
 * - feature_access.jurnal_alas bernilai true.
 */
export function hasAlasAccess(user: any): boolean {
  if (!user) return false
  if (user.is_superadmin === true || user.role?.is_superadmin === true || normalizedRoleName(user.role?.name) === 'superadmin') {
    return true
  }
  if (user.has_alas_access === true) {
    return true
  }
  if (user.feature_access?.jurnal_alas === true) {
    return true
  }
  return false
}

