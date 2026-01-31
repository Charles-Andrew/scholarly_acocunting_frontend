/**
 * UserProfile type definition
 */
export type UserProfile = {
  id: string
  email: string
  full_name?: string | null
  position?: string | null
  signature_image?: string | null
  is_active?: boolean | null
  created_at: string
  updated_at: string
}
