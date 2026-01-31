/**
 * Activity Log type definition
 */
export type ActivityLog = {
  id: string
  user_name: string
  action: string
  description: string
  resource_type: string | null
  resource_id: string | null
  created_at: string
}
