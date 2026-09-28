export type LawetUser = {
  id: string
  name: string
  username: string
  has_alas_access?: boolean
  feature_access?: Record<string, boolean>
  division_id?: string | null
  division?: {
    id?: string
    name: string
  } | null
  role: {
    id: string
    name: string
    level: number
    can_approve?: boolean
    is_superadmin?: boolean
  }
}
