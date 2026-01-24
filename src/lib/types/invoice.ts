/**
 * Invoice type definition
 */
export type Invoice = {
  id: string
  invoice_number: string
  client_id: string | null
  income_category_id: string | null
  date: string
  status: "draft" | "finalized" | "paid" | "cancelled"
  grand_total: number
  discount: number
  amount_due: number
  bank_account_id: string | null
  prepared_by: string | null
  approved_by: string | null
  created_at: string | null
  updated_at: string | null
  // Joined data
  client_name?: string
  income_category_name?: string
  prepared_by_name?: string
}
